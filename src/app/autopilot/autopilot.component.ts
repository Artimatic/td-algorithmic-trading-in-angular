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
    Strategy.InverseSwingtrade,
    Strategy.Daytrade,
    Strategy.Daytrade,
    Strategy.DaytradeShort,
    Strategy.Short
  ];

  riskCounter = 0;

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
    this.destroy$ = new Subject();
    this.backtestBuffer$ = new Subject();

    this.display = true;
    this.startNewInterval();
    this.interval = moment(this.getStartStopTime().startDateTime).diff(moment(), 'milliseconds');

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
          setTimeout(() => {
            this.processSellList();
            this.processBuyList();
            this.processDaytradeList();
          }, 120000);
          this.isBacktested = true;
        } else if (moment().isAfter(moment(startStopTime.startDateTime)) &&
          moment().isBefore(moment(startStopTime.endDateTime))) {
          if (this.isTradingStarted && (this.cartService.sellOrders.length ||
            this.cartService.buyOrders.length || this.cartService.otherOrders.length)) {
            console.log('Executing orders');

            this.executeOrderList();
          } else {
            this.processSellList();
            this.processBuyList();
            this.processDaytradeList();
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
  }

  developStrategy() {
    console.log('developStrategy');
    this.processCurrentPositions();
    const lastProfitLoss = JSON.parse(sessionStorage.getItem('profitLoss'));
    console.log('lastProfitLoss sessionStorage ', lastProfitLoss);
    if (lastProfitLoss && lastProfitLoss.profit) {
      if (lastProfitLoss.profit < 0) {
        this.decreaseRiskTolerance();
      } else {
        this.increaseRiskTolerance();
      }
    }

    switch (this.strategyList[this.strategyCounter]) {
      case Strategy.Daytrade: {
        this.findDaytrades();
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
        this.findDaytradeShort();
        break;
      }
      case Strategy.DaytradeShort: {
        this.findShort();
        break;
      }
      default: {
        break;
      }
    }
  }

  findDaytrades() {
    console.log('finding day trade');
    this.setLoading(true);
    this.backtestBuffer$.unsubscribe();
    this.backtestBuffer$ = new Subject();
    const cb = (stock, quantity, price) => {
      if (stock) {
        this.dayTradeList.push(stock);
      }

      if (this.dayTradeList.length < 3) {
        this.schedulerService.schedule(() => {
          this.triggerBacktestNext();
        }, `findTrades${stock}`, null, false, 180000);
      }
      this.setLoading(false);
    };
    this.backtestBuffer$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.machineDaytradingService.findSingleDaytrade(null, null, cb);
      }, () => {
        cb(null, null, null);
      });
    this.triggerBacktestNext();
  }

  findSwingtrades() {
    console.log('finding swing trade');
    this.backtestBuffer$.unsubscribe();
    this.backtestBuffer$ = new Subject();
    const aiPicks = this.aiPicksService.getBuyList();
    let counter = 0;
    if (aiPicks.length) {
      while (this.aiPicksService.getBuyList().length > 0 && this.buyList.length < 1 && counter < 50) {
        counter++;
        const prediction = this.aiPicksService.getBuyList().pop();
        console.log('Popping prediction ', prediction);
        let predictionSum = 0;
        for (const p of prediction.value) {
          predictionSum += p.prediction;
        }

        if (predictionSum / prediction.value.length > 0.6) {
          const stockHolding = {
            name: prediction.label,
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
          this.buyList.push(stockHolding);
        }
      }
    } else {
      if (this.buyList.length < 1) {
        console.log('listening for ml results');
        this.aiPicksService.mlBuyResults.pipe(
          takeUntil(this.destroy$),
          take(1)
        ).subscribe(latestMlResult => {
          console.log('Received ml buy results', latestMlResult);
          //const lastMlResult = JSON.parse(sessionStorage.getItem('profitLoss'));
          sessionStorage.setItem('lastMlResult', JSON.stringify(latestMlResult));
        });
        this.aiPicksService.mlNeutralResults.pipe(
          take(1),
          takeUntil(this.destroy$)
          ).subscribe(latestMlResult => {
          console.log('Received neutral results', latestMlResult);
          const timerInterval = counter > PrimaryList.length ? counter * 1000 : 60000;
          this.schedulerService.schedule(() => {
            this.triggerBacktestNext();
            counter++;
          }, `findTrades`, null, false, timerInterval);
        });
      }
      const cb = (stock) => {
        if (stock) {
          console.log('run ai ', stock);
          this.runAi(stock);
        } else {
          this.schedulerService.schedule(() => {
            this.triggerBacktestNext();
          }, `findTrades${stock}`, null, false, 60000);
        }
        this.setLoading(false);
      };
      this.backtestBuffer$
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.setLoading(true);
          this.machineDaytradingService.findSingleDaytrade(null, null, cb);
        }, () => {
          cb(null);
        });
      this.triggerBacktestNext();
    }
  }

  findDaytradeShort() {
    const randomIdx = Math.floor(Math.random() * BearList.length);

    const stock = BearList[randomIdx].ticker;
    this.dayTradeList.push(stock);
  }

  findShort() {
    const randomIdx = Math.floor(Math.random() * BearList.length);
    const stock = BearList[randomIdx].ticker;
    const stockHolding = {
      name: stock,
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

    this.buyList.push(stockHolding);
  }

  triggerBacktestNext() {
    this.backtestBuffer$.next();
  }

  processBuyList() {
    this.buyList.forEach(buyHolding => {
      this.portfolioBuy(buyHolding, floor(this.riskToleranceList[this.riskCounter] / this.buyList.length));
    });
    this.buyList = [];
  }

  processDaytradeList() {
    this.dayTradeList.forEach(stock => {
      this.portfolioDaytrade(stock, floor(this.riskToleranceList[this.riskCounter] / this.buyList.length));
    });
    this.dayTradeList = [];
  }

  processSellList() {
    this.sellList.forEach(holding => {
      this.portfolioSell(holding);
    });
    this.sellList = [];
  }

  addSell(holding: PortfolioInfoHolding) {
    if (this.sellList.findIndex(s => s.name === holding.name) === -1) {
      console.log('add sell ', holding, this.sellList);

      this.sellList.push(holding);
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
      startDate = currentMoment.subtract({ day: 1 });
    } else if (currentDay === 7) {
      startDate = currentMoment.subtract({ day: 1 });
    } else if (currentDay === 0) {
      startDate = currentMoment.subtract({ day: 2 });
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

  setLoading(value = true) {
    this.isLoading = value;
  }

  processCurrentPositions() {
    const holdings = [];
    const currentDate = moment().format('YYYY-MM-DD');
    const startDate = moment().subtract(365, 'days').format('YYYY-MM-DD');
    this.setLoading(true);

    this.authenticationService.checkCredentials(this.authenticationService?.selectedTdaAccount?.accountId)
      .subscribe(() => {
        this.portfolioService.getTdBalance()
          .subscribe((balance) => {
            const totalValue = balance.liquidationValue;

            this.portfolioService.getTdPortfolio()
              .pipe(
                finalize(() => this.setLoading(false))
              )
              .subscribe(data => {
                if (data) {
                  data.forEach((holding) => {
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
                      this.getTechnicalIndicators(holding.instrument.symbol, startDate, currentDate, holdings)
                        .subscribe((indicators) => {
                          const foundIdx = holdings.findIndex((value) => {
                            return value.name === stock;
                          });
                          holdings[foundIdx].recommendation = indicators.recommendation.recommendation;
                          const reasons = this.getRecommendationReason(indicators.recommendation);
                          holdings[foundIdx].buyReasons = reasons.buyReasons;
                          holdings[foundIdx].sellReasons = reasons.sellReasons;
                        });
                    }
                  });
                }
              });
          });
      });
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
        this.buyList.push(holding);
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
      if (percentLoss < -0.05) {
        this.portfolioSell(val);
      } else if (percentLoss > 0) {
        this.buyList.push(val);
      }
      this.scoreKeeperService.addProfitLoss(val.name, val.pl);
    });
  }

  buildOrder(symbol: string, quantity = 0, price = 0, side = 'DayTrade', orderSizePct = 1): SmartOrder {
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
      lossThreshold: -0.004,
      profitTarget: 0.009,
      trailingStop: -0.003,
      useStopLoss: true,
      useTrailingStopLoss: false,
      useTakeProfit: true,
      sellAtClose: side === 'DayTrade' ? true : false
    };
  }

  getAllocationPct(totalAllocationPct: number = 0.1, numberOfOrders: number) {
    return round(divide(totalAllocationPct, numberOfOrders), 2);
  }

  portfolioSell(holding: PortfolioInfoHolding) {
    this.portfolioService.getPrice(holding.name).subscribe(price => {
      const orderSizePct = (this.riskToleranceList[this.riskCounter] > 0.5) ? 0.3 : 1;
      const order = this.buildOrder(holding.name, holding.shares, price, 'Sell', orderSizePct);
      this.cartService.addToCart(order);
    });
  }

  portfolioBuy(holding: PortfolioInfoHolding, allocation: number) {
    this.portfolioService.getPrice(holding.name).subscribe((price) => {
      this.portfolioService.getTdBalance().subscribe((data) => {
        const quantity = this.getQuantity(price, allocation, data.cashAvailableForTrading);
        const orderSizePct = (this.riskToleranceList[this.riskCounter] > 0.5) ? 1 : 0.3;

        const order = this.buildOrder(holding.name, quantity, price, 'Buy', orderSizePct);
        this.cartService.addToCart(order);
      });
    });
  }

  portfolioDaytrade(symbol: string, allocation: number) {
    this.portfolioService.getPrice(symbol).subscribe((price) => {
      this.portfolioService.getTdBalance().subscribe((data) => {
        const quantity = this.getQuantity(price, allocation, data.cashAvailableForTrading);
        const orderSizePct = (this.riskToleranceList[this.riskCounter] > 0.5) ? 1 : 0.3;

        const order = this.buildOrder(symbol, quantity, price, 'Daytrade', orderSizePct);
        this.cartService.addToCart(order);
      });
    });
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
