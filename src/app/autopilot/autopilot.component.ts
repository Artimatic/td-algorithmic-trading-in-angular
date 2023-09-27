import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { TimerObservable } from 'rxjs-compat/observable/TimerObservable';
import { finalize, takeUntil, take } from 'rxjs/operators';
import * as moment from 'moment-timezone';
import { AiPicksService, AuthenticationService, BacktestService, CartService, PortfolioInfoHolding, PortfolioService, ReportingService, ScoreKeeperService, TradeService } from '@shared/services';
import { SchedulerService } from '@shared/service/scheduler.service';
import { BacktestResponse } from '../rh-table';
import { SmartOrder } from '@shared/index';
import { divide, floor, round } from 'lodash';
import { DailyBacktestService } from '@shared/daily-backtest.service';
import { MessageService } from 'primeng/api';
import { AlgoQueueItem } from '@shared/services/trade.service';
import { ScoringIndex } from '@shared/services/score-keeper.service';
import { MachineDaytradingService } from '../machine-daytrading/machine-daytrading.service';
import { BearList, PrimaryList } from '../rh-table/backtest-stocks.constant';
import { AiPicksPredictionData } from '@shared/services/ai-picks.service';

export interface PositionHoldings {
  name: string;
  pl: number;
  netLiq: number;
  shares: number;
  alloc: number;
  recommendation: 'None' | 'Bullish' | 'Bearish';
  buyReasons: string;
  sellReasons: string;
  buyConfidence: number;
  sellConfidence: number;
  prediction: number;
}

export interface ProfitLossRecord {
  date: string;
  profit: number;
  lastStrategy: string;
  profitRecord: ScoringIndex<number>;
}

export enum DaytradingAlgorithms {
  recommendation,
  bband,
  demark9,
  macd,
  mfi,
  mfiTrade,
  roc,
  vwma
}

export enum SwingtradeAlgorithms {
  recommendation,
  demark9,
  macd,
  mfi,
  mfiDivergence,
  mfiDivergence2,
  mfiLow,
  mfiTrade,
  roc,
  vwma
}

export enum Strategy {
  DaytradeShort = 'DaytradeShort',
  Daytrade = 'Daytrade',
  Swingtrade = 'Swingtrade',
  InverseSwingtrade = 'InverseSwingtrade',
  Short = 'Short',
}

export enum RiskTolerance {
  None = 0.05,
  ExtremeFear = 0.1,
  Fear = 0.25,
  Neutral = 0.5,
  Greed = 0.75,
  ExtremeGreed = 1
}

@Component({
  selector: 'app-autopilot',
  templateUrl: './autopilot.component.html',
  styleUrls: ['./autopilot.component.css']
})
export class AutopilotComponent implements OnInit, OnDestroy {
  display = false;
  isLoading = true;
  defaultInterval = 70800;
  interval = 70800;
  oneDayInterval;
  timer;
  alive = false;
  destroy$ = new Subject();
  buyList: PortfolioInfoHolding[] = [];
  dayTradeList: string[] = [];
  sellList: PortfolioInfoHolding[] = [];

  strategyCounter = 0;

  strategyList = [
    Strategy.Swingtrade,
    Strategy.Daytrade,
    Strategy.InverseSwingtrade,
    Strategy.DaytradeShort,
    Strategy.Short
  ];

  riskCounter = 2;

  riskToleranceList = [
    RiskTolerance.None,
    RiskTolerance.ExtremeFear,
    RiskTolerance.Fear,
    RiskTolerance.Neutral,
    RiskTolerance.Greed,
    RiskTolerance.ExtremeGreed
  ];

  backtestBuffer$;

  isBacktested = false;

  isTradingStarted = false;

  constructor(
    private authenticationService: AuthenticationService,
    private portfolioService: PortfolioService,
    private schedulerService: SchedulerService,
    private aiPicksService: AiPicksService,
    private backtestService: BacktestService,
    private cartService: CartService,
    private dailyBacktestService: DailyBacktestService,
    private messageService: MessageService,
    private scoreKeeperService: ScoreKeeperService,
    private reportingService: ReportingService,
    private tradeService: TradeService,
    private machineDaytradingService: MachineDaytradingService
  ) { }

  ngOnInit(): void {
  }

  open() {
    const lastStrategy = JSON.parse(sessionStorage.getItem('lastStrategy'));
    const lastStrategyCount = this.strategyList.findIndex(strat => strat === lastStrategy);
    this.strategyCounter = lastStrategyCount >= 0 ? lastStrategyCount : 0;

    this.destroy$ = new Subject();
    if (this.backtestBuffer$) {
      this.backtestBuffer$.unsubscribe();
    }
    this.backtestBuffer$ = new Subject();

    this.display = true;
    this.startNewInterval();
    this.interval = Math.abs(moment(this.getStartStopTime().startDateTime).diff(moment(), 'milliseconds'));

    // TimerObservable.create(0, moment(this.getStartStopTime().startDateTime).diff(moment(), 'milliseconds'))
    //   .pipe(takeUntil(this.destroy$))
    //   .subscribe(() => {
    //     this.timer.unsubscribe();
    //     console.log('dailytimer');

    //     this.startNewInterval();
    //   });

    this.messageService.add({
      key: 'autopilot_start',
      severity: 'success',
      summary: 'Autopilot started'
    });
  }

  startNewInterval() {
    console.log('startNewInterval');
    this.timer = TimerObservable.create(0, this.interval)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const startStopTime = this.getStartStopTime();
        // console.log('startStopTime ', (startStopTime.startDateTime),
        //   (startStopTime.endDateTime),
        //   moment().isAfter(moment(startStopTime.startDateTime)));
        if (!this.isBacktested) {
          this.developStrategy();
          console.log('new interval ', this.interval, moment(startStopTime.startDateTime),
            startStopTime.startDateTime.getUTCMilliseconds(),
            moment(startStopTime.startDateTime).valueOf());
          this.isBacktested = true;
        } else if (moment().isAfter(moment(startStopTime.startDateTime)) &&
          moment().isBefore(moment(startStopTime.endDateTime))) {
          if (this.isTradingStarted && (this.cartService.sellOrders.length ||
            this.cartService.buyOrders.length || this.cartService.otherOrders.length)) {
            console.log('Executing orders');

            this.executeOrderList();
          } else {
            this.processLists();
            setTimeout(() => {
              this.initializeOrders();
              this.isTradingStarted = true;
            }, this.defaultInterval);
          }
        } else if (moment().isAfter(moment(startStopTime.endDateTime)) &&
          moment().isBefore(moment(startStopTime.endDateTime).add(2, 'minutes'))) {
          console.log('Stopping');

          if (this.reportingService.logs.length > 0) {
            const profitLog = `Profit ${this.scoreKeeperService.total}`;
            this.reportingService.addAuditLog(null, profitLog);
            this.reportingService.exportAuditHistory();
            const profitObj: ProfitLossRecord = {
              'date': moment().format(),
              profit: this.scoreKeeperService.total,
              lastStrategy: this.strategyList[this.strategyCounter],
              profitRecord: this.scoreKeeperService.profitLossHash
            };
            sessionStorage.setItem('profitLoss', JSON.stringify(profitObj));
            this.scoreKeeperService.resetTotal();
            this.resetCart();
          }
        }
      });
  }

  stop() {
    this.display = false;
    this.timer.unsubscribe();
    this.cleanUp();
    this.messageService.add({
      key: 'autopilot_stop',
      severity: 'danger',
      summary: 'Autopilot stopped'
    });
  }

  resetCart() {
    this.isBacktested = false;
    this.isTradingStarted = false;
    this.buyList = [];
    this.dayTradeList = [];
    this.sellList = [];
    this.cartService.deleteCart();
  }

  decreaseRiskTolerance() {
    if (this.riskCounter > 0) {
      this.riskCounter--;
    }
    this.changeStrategy();
  }

  increaseRiskTolerance() {
    if (this.riskCounter < this.riskToleranceList.length - 1) {
      this.riskCounter++;
    }
  }

  changeStrategy() {
    if (this.strategyCounter < this.strategyList.length - 1) {
      this.strategyCounter++;
    } else {
      this.strategyCounter = 0;
    }
    const strat = this.strategyList[this.strategyCounter];
    this.messageService.add({
      key: 'strategy_change',
      severity: 'info',
      summary: `Strategy changed to ${strat}`
    });
    console.log('strategy changed ', strat);
  }

  async developStrategy() {
    console.log('developing strategy');

    const lastProfitLoss = JSON.parse(sessionStorage.getItem('profitLoss'));
    if (lastProfitLoss && lastProfitLoss.profit) {
      if (lastProfitLoss.profit < 0) {
        this.decreaseRiskTolerance();
      } else {
        this.increaseRiskTolerance();
      }
    }
    console.log('lastProfitLoss sessionStorage ', lastProfitLoss, this.riskToleranceList[this.riskCounter]);

    this.processCurrentPositions();

    sessionStorage.setItem('lastStrategy', JSON.stringify(this.strategyList[this.strategyCounter]));
  }

  async getNewTrades() {
    switch (this.strategyList[this.strategyCounter]) {
      case Strategy.Daytrade: {
        await this.findDaytrades();
        break;
      }
      case Strategy.Swingtrade: {
        this.findSwingtrades();
        break;
      }
      case Strategy.InverseSwingtrade: {
        this.findSwingtrades();
        break;
      }
      case Strategy.Short: {
        this.findShort();
        break;
      }
      case Strategy.DaytradeShort: {
        await this.findDaytradeShort();
        break;
      }
      default: {
        await this.findDaytrades();
        break;
      }
    }
  }

  isBuyPrediction(prediction: { label: string, value: AiPicksPredictionData[] }) {
    if (prediction) {
      let predictionSum = 0;
      let predictionAccuracySum = 0;
      for (const p of prediction.value) {
        predictionSum += p.prediction;
        predictionAccuracySum += p.accuracy || 0;
      }

      if (prediction.value[0].accuracy === null || (predictionAccuracySum / prediction.value.length) > 0.7 &&
        (predictionSum / prediction.value.length > 0.7)) {
        return true;
      }
    }
    return false;
  }

  async findDaytrades() {
    console.log('finding day trade');
    this.machineDaytradingService.resetStockCounter();

    let counter = 0;
    while (counter < PrimaryList.length + 31) {
      counter++;
      const stock = this.machineDaytradingService.getNextStock();
      const backtestDate = this.getLastTradeDate();
      console.log('last date', backtestDate);
      const trainingResults = await this.machineDaytradingService.trainStock(stock, backtestDate.subtract({ days: 1 }).format('YYYY-MM-DD'), backtestDate.add({ days: 1 }).format('YYYY-MM-DD'));
      console.log('training daytrade results ', trainingResults);
      if (trainingResults[0].correct / trainingResults[0].guesses > 0.6 && trainingResults[0].guesses > 50) {
        console.log('adding day trade', stock);
        this.addDaytrade(stock);
        // this.portfolioDaytrade(stock, this.riskToleranceList[this.riskCounter]);
        if (this.dayTradeList.length > 2) {
          break;
        }
      }
    }
  }

  findSwingtrades() {
    console.log('finding swing trade');
    this.machineDaytradingService.resetStockCounter();
    this.backtestBuffer$.unsubscribe();
    this.backtestBuffer$ = new Subject();
    const noOpportunityCounter = PrimaryList.length;
    this.aiPicksService.mlNeutralResults.pipe(
      take(noOpportunityCounter),
      finalize(() => {
        this.setLoading(false);
        this.processBuyList();
      })
    ).subscribe(latestMlResult => {
      console.log('Received neutral results', latestMlResult);
      if (this.isBuyPrediction(latestMlResult)) {
        const stockHolding = {
          name: latestMlResult.label,
          pl: 0,
          netLiq: 0,
          shares: 0,
          alloc: 0,
          recommendation: 'None',
          buyReasons: '',
          sellReasons: '',
          buyConfidence: 0,
          sellConfidence: 0,
          prediction: null
        };
        console.log('Adding buy ', stockHolding);
        // const lastMlResult = JSON.parse(sessionStorage.getItem('profitLoss'));
        sessionStorage.setItem('lastMlResult', JSON.stringify(latestMlResult));
        this.addBuy(stockHolding);
      }
      this.schedulerService.schedule(() => {
        this.triggerBacktestNext();
      }, `findTrades`, null, false, 60000);
    });
    this.setLoading(true);

    this.backtestBuffer$
      .pipe(takeUntil(this.destroy$),
        finalize(() => this.setLoading(false))
      )
      .subscribe(() => {
        const stock = this.machineDaytradingService.getNextStock();
        console.log('run ai on ', stock);
        this.runAi(stock);
      });
    this.triggerBacktestNext();
  }

  async findDaytradeShort() {
    console.log('finding bearish day trade');
    this.machineDaytradingService.resetStockCounter();

    let idx = 0;
    while (idx < BearList.length) {
      idx++;
      const stock = BearList[idx].ticker;
      const backtestDate = this.getLastTradeDate();
      console.log('last date', backtestDate);
      const trainingResults = await this.machineDaytradingService.trainStock(stock, backtestDate.subtract({ days: 1 }).format('YYYY-MM-DD'), backtestDate.add({ days: 1 }).format('YYYY-MM-DD'));
      console.log('training daytrade results ', trainingResults);
      if (trainingResults[0].correct / trainingResults[0].guesses > 0.6 && trainingResults[0].guesses > 50) {
        console.log('adding day trade', stock);
        this.addDaytrade(stock);
        this.portfolioDaytrade(stock, this.riskToleranceList[this.riskCounter]);
        if (this.dayTradeList.length > 2) {
          break;
        }
      }
    }
    this.setLoading(false);
  }

  findShort() {
    let idx = -1;
    console.log('finding short');
    this.machineDaytradingService.resetStockCounter();
    this.backtestBuffer$.unsubscribe();
    this.backtestBuffer$ = new Subject();
    this.aiPicksService.mlNeutralResults.pipe(
      take(BearList.length),
      finalize(() => {
        this.processBuyList();
        this.setLoading(false);
      })
    ).subscribe(latestMlResult => {
      console.log('Received neutral results', latestMlResult);
      if (this.isBuyPrediction(latestMlResult)) {
        const stockHolding = {
          name: latestMlResult.label,
          pl: 0,
          netLiq: 0,
          shares: 0,
          alloc: 0,
          recommendation: 'None',
          buyReasons: '',
          sellReasons: '',
          buyConfidence: 0,
          sellConfidence: 0,
          prediction: null
        };
        console.log('Adding buy ', stockHolding)
          ;       // const lastMlResult = JSON.parse(sessionStorage.getItem('profitLoss'));
        sessionStorage.setItem('lastMlResult', JSON.stringify(latestMlResult));
        this.addBuy(stockHolding);
      }
      this.schedulerService.schedule(() => {
        this.triggerBacktestNext();
      }, `findTrades`, null, false, 60000);
    });
    this.setLoading(true);

    this.backtestBuffer$
      .pipe(takeUntil(this.destroy$),
        finalize(() => this.setLoading(false))
      )
      .subscribe(() => {
        const stock = BearList[idx++].ticker;
        console.log('run ai on ', stock);
        this.runAi(stock);
      });
    this.triggerBacktestNext();
  }

  triggerBacktestNext() {
    this.backtestBuffer$.next();
  }

  async processBuyList() {
    for (const buyHolding of this.buyList) {
      await this.portfolioBuy(buyHolding, round(this.riskToleranceList[this.riskCounter] / this.buyList.length, 2));
    }
  }

  async processDaytradeList() {
    for (const stock of this.dayTradeList) {
      await this.portfolioDaytrade(stock, round(this.riskToleranceList[this.riskCounter] / this.dayTradeList.length, 2));
    }
  }

  async processSellList() {
    for (const holding of this.sellList) {
      await this.portfolioSell(holding);
    }
  }

  async processLists() {
    console.log('processing list ', this.buyList, this.sellList, this.dayTradeList);
    await this.processSellList();
    await this.processBuyList();
    await this.processDaytradeList();
  }

  addSell(holding: PortfolioInfoHolding) {
    if (this.sellList.findIndex(s => s.name === holding.name) === -1) {
      console.log('add sell ', holding, this.sellList);

      this.sellList.push(holding);
    }
  }

  addBuy(holding: PortfolioInfoHolding) {
    if (this.buyList.length < 10) {
      if (this.buyList.findIndex(s => s.name === holding.name) === -1) {
        console.log('add buy ', holding, this.sellList);

        this.buyList.push(holding);
      }
    }
  }

  addDaytrade(stock: string) {
    if (this.dayTradeList.length < 10) {
      if (this.dayTradeList.findIndex(s => s === stock) === -1) {
        console.log('add daytrade ', stock, this.sellList);

        this.dayTradeList.push(stock);
      }
    }
  }

  initializeOrders() {
    const concat = this.cartService.sellOrders.concat(this.cartService.buyOrders);
    const orders = concat.concat(this.cartService.otherOrders);
    orders.forEach((order: SmartOrder) => {
      order.stopped = false;
      const queueItem: AlgoQueueItem = {
        symbol: order.holding.symbol,
        reset: true
      };

      this.tradeService.algoQueue.next(queueItem);
    });
  }

  executeOrderList() {
    const concat = this.cartService.sellOrders.concat(this.cartService.buyOrders);
    const orders = concat.concat(this.cartService.otherOrders);
    const simultaneousOrderLimit = 3;
    const limit = simultaneousOrderLimit > orders.length ? orders.length : simultaneousOrderLimit;

    let executed = 0;
    let lastIndex = 0;

    while (executed < limit && lastIndex < orders.length) {
      const queueItem: AlgoQueueItem = {
        symbol: orders[lastIndex].holding.symbol,
        reset: false
      };

      setTimeout(() => {
        this.tradeService.algoQueue.next(queueItem);
      }, 500 * lastIndex);
      lastIndex++;
      executed++;
    }
    if (lastIndex >= orders.length) {
      lastIndex = 0;
    }
  }

  getStartStopTime() {
    const endTime = '15:50';
    const currentMoment = moment().tz('America/New_York').set({ hour: 9, minute: 50 });
    const currentEndMoment = moment().tz('America/New_York').set({ hour: 15, minute: 50 });
    const currentDay = currentMoment.day();
    let startDate;

    if (currentDay === 6) {
      startDate = currentMoment.add({ day: 2 });
    } else if (currentDay === 0) {
      startDate = currentMoment.add({ day: 1 });
    } else {
      if (moment().isAfter(currentMoment) && moment().isBefore(currentEndMoment)) {
        startDate = currentMoment;
      } else {
        startDate = moment().tz('America/New_York').set({ hour: 9, minute: 50 }).add(1, 'days');
      }
    }

    const startDateTime = moment.tz(startDate.format(), 'America/New_York').toDate();
    const endDateTime = moment.tz(`${startDate.format('YYYY-MM-DD')} ${endTime}`, 'America/New_York').toDate();
    return {
      startDateTime,
      endDateTime
    };
  }

  getLastTradeDate() {
    const currentMoment = moment().tz('America/New_York').set({ hour: 9, minute: 50 });
    const currentDay = currentMoment.day();
    let lastTradeDate = currentMoment.subtract({ day: 1 });

    if (currentDay === 6) {
      lastTradeDate = currentMoment.subtract({ day: 1 });
    } else if (currentDay === 7) {
      lastTradeDate = currentMoment.subtract({ day: 2 });
    } else if (currentDay === 0) {
      lastTradeDate = currentMoment.subtract({ day: 2 });
    } else if (currentDay === 1) {
      lastTradeDate = currentMoment.subtract({ day: 3 });
    }

    return moment.tz(lastTradeDate.format(), 'America/New_York');
  }

  setLoading(value: boolean) {
    this.isLoading = value;
  }

  async processCurrentPositions() {
    await this.authenticationService.checkCredentials(this.authenticationService?.selectedTdaAccount?.accountId).toPromise();
    const holdings = [];
    const currentDate = moment().format('YYYY-MM-DD');
    const startDate = moment().subtract(365, 'days').format('YYYY-MM-DD');
    this.setLoading(true);
    const balance: any = await this.portfolioService.getTdBalance().toPromise();
    const totalValue = balance.cashBalance;

    if (totalValue > 0) {
      const data = await this.portfolioService.getTdPortfolio()
        .pipe(
          finalize(() => this.setLoading(false))
        ).toPromise();

      if (data) {
        for (const holding of data) {
          const stock = holding.instrument.symbol;
          let pl;
          if (holding.instrument.assetType.toLowerCase() === 'option') {
            pl = holding.marketValue - (holding.averagePrice * holding.longQuantity) * 100;
          } else {
            pl = holding.marketValue - (holding.averagePrice * holding.longQuantity);
          }
          holdings.push({
            name: stock,
            pl,
            netLiq: holding.marketValue,
            shares: holding.longQuantity,
            alloc: (holding.averagePrice * holding.longQuantity) / totalValue,
            recommendation: 'None',
            buyReasons: '',
            sellReasons: '',
            buyConfidence: 0,
            sellConfidence: 0,
            prediction: null
          });

          if (holding.instrument.assetType.toLowerCase() === 'equity') {
            const indicators = await this.getTechnicalIndicators(holding.instrument.symbol, startDate, currentDate, holdings).toPromise();
            const foundIdx = holdings.findIndex((value) => {
              return value.name === stock;
            });
            holdings[foundIdx].recommendation = indicators.recommendation.recommendation;
            const reasons = this.getRecommendationReason(indicators.recommendation);
            holdings[foundIdx].buyReasons = reasons.buyReasons;
            holdings[foundIdx].sellReasons = reasons.sellReasons;
          }
        }
        this.checkIfTooManyHoldings(holdings);
      }
      this.getNewTrades();
    }
  }

  getTechnicalIndicators(stock: string, startDate: string, currentDate: string, holdings) {
    return this.backtestService.getBacktestEvaluation(stock, startDate, currentDate, 'daily-indicators')
      .map((indicatorResults: BacktestResponse) => {
        this.checkForStopLoss(holdings);
        this.getIndicatorScore(stock, indicatorResults.signals, holdings);
        return indicatorResults.signals[indicatorResults.signals.length - 1];
      });
  }

  getIndicatorScore(stock, signals, holdings) {
    this.dailyBacktestService.getSignalScores(signals).subscribe((score) => {
      const foundIdx = holdings.findIndex((value) => {
        return value.name === stock;
      });

      if (holdings[foundIdx].buyReasons) {
        const indicators = holdings[foundIdx].buyReasons.split(',');

        for (const i in indicators) {
          if (indicators.hasOwnProperty(i)) {
            holdings[foundIdx].buyConfidence += score[indicators[i]].bullishMidTermProfitLoss;
            this.analyseRecommendations(holdings[foundIdx]);
          }
        }
      }
      if (holdings[foundIdx].sellReasons) {
        const indicators = holdings[foundIdx].sellReasons.split(',');
        for (const i in indicators) {
          if (indicators.hasOwnProperty(i)) {
            holdings[foundIdx].sellConfidence += score[indicators[i]].bearishMidTermProfitLoss;
            this.analyseRecommendations(holdings[foundIdx]);
          }
        }
      }
    });
  }

  analyseRecommendations(holding: PortfolioInfoHolding) {
    if (holding.recommendation.toLowerCase() === 'buy') {
      if (holding.buyConfidence > 0) {
        console.log('Buying ', holding.name);
        this.addBuy(holding);
      }
    } else if (holding.recommendation.toLowerCase() === 'sell') {
      if (holding.sellConfidence > 0) {
        this.addSell(holding);
      }
    }
  }

  checkForStopLoss(holdings: PositionHoldings[]) {
    holdings.forEach(val => {
      const percentLoss = divide(val.pl, val.netLiq);
      if (percentLoss < -0.051) {
        this.portfolioSell(val);
      } else if (percentLoss > 0) {
        this.addBuy(val);
      }
      if (!this.scoreKeeperService.profitLossHash[val.name]) {
        this.scoreKeeperService.addProfitLoss(val.name, val.pl);
      }
    });
  }

  checkIfTooManyHoldings(currentHoldings: any[]) {
    if (currentHoldings.length > 10) {
      currentHoldings.sort((a, b) => a.pl - b.pl);
      const toBeSold = currentHoldings.slice(currentHoldings.length - 10, currentHoldings.length);
      console.log('too many holdings. selling', toBeSold, 'from', currentHoldings);

      if (this.strategyList[this.strategyCounter] === Strategy.Swingtrade) {
        this.changeStrategy();
      }
    }
  }

  buildOrder(symbol: string, quantity = 0, price = 0,
    side = 'DayTrade', orderSizePct = 1, lossThreshold = -0.005,
    profitTarget = 0.01, trailingStop = -0.003): SmartOrder {
    return {
      holding: {
        instrument: null,
        symbol,
      },
      quantity,
      price,
      submitted: false,
      pending: false,
      orderSize: floor(quantity * orderSizePct),
      side,
      lossThreshold: lossThreshold,
      profitTarget: profitTarget,
      trailingStop: trailingStop,
      useStopLoss: true,
      useTrailingStopLoss: true,
      useTakeProfit: true,
      sellAtClose: side === 'DayTrade' ? true : false
    };
  }

  getAllocationPct(totalAllocationPct: number = 0.1, numberOfOrders: number) {
    return round(divide(totalAllocationPct, numberOfOrders), 2);
  }

  async portfolioSell(holding: PortfolioInfoHolding) {
    const price = await this.portfolioService.getPrice(holding.name).toPromise();
    const orderSizePct = (this.riskToleranceList[this.riskCounter] > 0.5) ? 0.3 : 1;
    const order = this.buildOrder(holding.name, holding.shares, price, 'Sell',
      orderSizePct, null, null, null);
    this.cartService.addToCart(order);
  }

  async portfolioBuy(holding: PortfolioInfoHolding, allocation: number) {
    const price = await this.portfolioService.getPrice(holding.name).toPromise();
    const data = await this.portfolioService.getTdBalance().toPromise();
    const quantity = this.getQuantity(price, allocation, data.cashBalance);
    const orderSizePct = (this.riskToleranceList[this.riskCounter] > 0.5) ? 1 : 0.3;
    const riskTolerance = this.riskToleranceList[this.riskCounter] / 100;
    const intraDayTolerance = riskTolerance < 0.003 ? 0.005 : round(riskTolerance, 4);
    const order = this.buildOrder(holding.name, quantity, price, 'Buy',
      orderSizePct, intraDayTolerance * -1, round(intraDayTolerance * 2, 4), intraDayTolerance * -1);
    this.cartService.addToCart(order);
  }

  async portfolioDaytrade(symbol: string, allocation: number) {
    const price = await this.portfolioService.getPrice(symbol).toPromise();
    const data = await this.portfolioService.getTdBalance().toPromise();
    const quantity = this.getQuantity(price, allocation, data.cashBalance);
    const orderSizePct = (this.riskToleranceList[this.riskCounter] > 0.5) ? 1 : 0.3;
    const riskTolerance = this.riskToleranceList[this.riskCounter] / 100;
    const intraDayTolerance = riskTolerance < 0.003 ? 0.005 : round(riskTolerance, 4);
    const order = this.buildOrder(symbol, quantity, price, 'Daytrade', orderSizePct, intraDayTolerance * -1, round(intraDayTolerance * 2, 4), intraDayTolerance * -1);
    this.cartService.addToCart(order);
  }

  private getQuantity(stockPrice: number, allocationPct: number, total: number) {
    const totalCost = round(total * allocationPct, 2);
    return floor(totalCost / stockPrice);
  }

  getRecommendationReason(recommendation) {
    const reasons = {
      buyReasons: '',
      sellReasons: ''
    };

    const buyReasons = [];
    const sellReasons = [];

    for (const rec in recommendation) {
      if (recommendation.hasOwnProperty(rec)) {
        if (recommendation[rec].toLowerCase() === 'bullish') {
          buyReasons.push(rec);
        } else if (recommendation[rec].toLowerCase() === 'bearish') {
          sellReasons.push(rec);
        }
      }
    }

    reasons.buyReasons += buyReasons.join(',');
    reasons.sellReasons += sellReasons.join(',');

    return reasons;
  }

  runAi(stockName: string) {
    this.schedulerService.schedule(() => {
      this.aiPicksService.tickerSellRecommendationQueue.next(stockName);
      this.aiPicksService.tickerBuyRecommendationQueue.next(stockName);
    }, 'portfolio_mgmt_ai');
  }

  cleanUp() {
    this.resetCart();
    this.destroy$.next();
    this.destroy$.complete();
    this.backtestBuffer$.unsubscribe();
  }

  ngOnDestroy() {
    this.cleanUp();
  }
}
