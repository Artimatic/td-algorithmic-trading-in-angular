import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { TimerObservable } from 'rxjs-compat/observable/TimerObservable';
import { finalize, takeUntil, take } from 'rxjs/operators';
import * as moment from 'moment-timezone';
import { AuthenticationService, BacktestService, CartService, DaytradeService, MachineLearningService, PortfolioInfoHolding, PortfolioService, ReportingService, ScoreKeeperService, TradeService } from '@shared/services';
import { BacktestResponse } from '../rh-table';
import { SmartOrder } from '@shared/index';
import { divide, floor, round } from 'lodash';
import { DailyBacktestService } from '@shared/daily-backtest.service';
import { MessageService } from 'primeng/api';
import { AlgoQueueItem } from '@shared/services/trade.service';
import { ScoringIndex } from '@shared/services/score-keeper.service';
import { MachineDaytradingService } from '../machine-daytrading/machine-daytrading.service';
import { BearList, PersonalBullishPicks, PersonalBearishPicks } from '../rh-table/backtest-stocks.constant';
import { CurrentStockList } from '../rh-table/stock-list.constant';
import { AiPicksPredictionData } from '@shared/services/ai-picks.service';
import Stocks from '../rh-table/backtest-stocks.constant';
import { FindPatternService } from '../strategies/find-pattern.service';
import { GlobalSettingsService } from '../settings/global-settings.service';
import { BacktestTableService } from '../backtest-table/backtest-table.service';
import { PotentialTrade } from '../backtest-table/potential-trade.constant';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { AddOptionsTradeComponent } from './add-options-trade/add-options-trade.component';
import { FindDaytradeService } from './find-daytrade.service';
import { Trade } from '@shared/models/trade';

export interface PositionHoldings {
  name: string;
  pl: number;
  netLiq: number;
  shares: number;
  alloc: number;
  recommendation: 'None' | 'Bullish' | 'Bearish' | null;
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
  lastRiskTolerance: number;
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
  TrimHoldings = 'TrimHoldings',
  DaytradeFullList = 'DaytradeFullList',
  StateMachine = 'StateMachine',
  SingleStockPick = 'SingleStockPick',
  MLSpy = 'MLSpy',
  OptionsStrangle = 'OptionsStrangle'
}

export enum RiskTolerance {
  Zero = 0.01,
  Lower = 0.02,
  Low = 0.05,
  ExtremeFear = 0.1,
  Fear = 0.25,
  Neutral = 0.5,
  Greed = 0.75,
  ExtremeGreed = 1,
  XLGreed = 1.05,
  XXLGreed = 1.1,
  XXXLGreed = 1.25,
  XXXXLGreed = 1.5,
  XXXXXLGreed = 1.75,
}

@Component({
  selector: 'app-autopilot',
  templateUrl: './autopilot.component.html',
  styleUrls: ['./autopilot.component.scss']
})
export class AutopilotComponent implements OnInit, OnDestroy {
  display = false;
  isLoading = true;
  defaultInterval = 70300;
  interval = 70300;
  oneDayInterval;
  timer;
  alive = false;
  destroy$ = new Subject();
  currentHoldings: PortfolioInfoHolding[] = [];
  strategyCounter = null;
  maxTradeCount = 3;
  strategyList = [
    // Strategy.OptionsStrangle,
    //Strategy.MLSpy,
    // Strategy.SingleStockPick,
    // Strategy.StateMachine,
    //Strategy.Swingtrade,
    Strategy.Daytrade,
    //Strategy.TrimHoldings,
    // Strategy.InverseSwingtrade,
    //Strategy.DaytradeShort,
    // Strategy.Short,
    // Strategy.DaytradeFullList,
  ];

  bearishStrategy = [
    Strategy.MLSpy,
    Strategy.TrimHoldings,
    Strategy.DaytradeShort,
    Strategy.Short
  ];

  riskCounter = 0;
  dayTradeRiskCounter = 0;

  riskToleranceList = [
    RiskTolerance.Low,
    RiskTolerance.ExtremeFear,
    RiskTolerance.Fear,
    RiskTolerance.Neutral,
    RiskTolerance.Greed,
    RiskTolerance.ExtremeGreed
  ];

  dayTradingRiskToleranceList = [
    RiskTolerance.Low,
    RiskTolerance.ExtremeFear,
    RiskTolerance.Fear,
    RiskTolerance.Neutral,
    RiskTolerance.ExtremeGreed
  ];

  backtestBuffer$;

  simultaneousOrderLimit = 3;
  executedIndex = 0;
  lastOrderListIndex = 0;

  lastInterval = moment();

  lastMarketHourCheck = null;
  isLive = false;

  unsubscribe$ = new Subject();

  revealPotentialStrategy = false;

  strategies: PotentialTrade[] = [];

  dialogRef: DynamicDialogRef | undefined;
  
  lastReceivedRecommendation = null;

  constructor(
    private authenticationService: AuthenticationService,
    private portfolioService: PortfolioService,
    private backtestService: BacktestService,
    private backtestTableService: BacktestTableService,
    private cartService: CartService,
    private dailyBacktestService: DailyBacktestService,
    private messageService: MessageService,
    private scoreKeeperService: ScoreKeeperService,
    private reportingService: ReportingService,
    private tradeService: TradeService,
    private machineDaytradingService: MachineDaytradingService,
    private findPatternService: FindPatternService,
    private machineLearningService: MachineLearningService,
    private globalSettingsService: GlobalSettingsService,
    private daytradeService: DaytradeService,
    public dialogService: DialogService,
    private findDaytradeService: FindDaytradeService
  ) { }

  ngOnInit(): void {
    const lastStrategy = JSON.parse(localStorage.getItem('profitLoss'));
    if (lastStrategy && lastStrategy.lastStrategy) {
      const lastStrategyCount = this.strategyList.findIndex(strat => strat.toLowerCase() === lastStrategy.lastStrategy.toLowerCase());
      this.strategyCounter = lastStrategyCount >= 0 ? lastStrategyCount : 0;
      this.riskCounter = lastStrategy.lastRiskTolerance || 0;
    } else {
      this.strategyCounter = 0;
    }

    this.findDaytradeService.getTradeObserver()
      .pipe(takeUntil(this.destroy$))
      .subscribe((trade: Trade) => {
        this.lastReceivedRecommendation = moment();
        if (this.cartService.otherOrders.length < 1) {
          this.addDaytrade(trade.stock);
          this.cartService.removeCompletedOrders();
        }
      });
  }

  open() {
    this.destroy$ = new Subject();
    if (this.backtestBuffer$) {
      this.backtestBuffer$.unsubscribe();
    }
    this.backtestBuffer$ = new Subject();

    this.display = true;
    this.startNewInterval();
    //this.interval = Math.abs(moment(this.globalSettingsService.getStartStopTime().startDateTime).diff(moment(), 'milliseconds'));
    this.interval = this.defaultInterval;
    this.messageService.add({
      severity: 'success',
      summary: 'Autopilot started'
    });
  }

  startNewInterval() {
    this.developStrategy();
    if (this.timer) {
      this.timer.unsubscribe();
    }
    this.timer = TimerObservable.create(1000, this.interval)
      .pipe(takeUntil(this.destroy$))
      .subscribe(async () => {
        const startStopTime = this.globalSettingsService.getStartStopTime();
        if (moment().isAfter(moment(startStopTime.endDateTime).subtract(5, 'minutes')) &&
          moment().isBefore(moment(startStopTime.endDateTime))) {
          this.buyAtClose()
          if (this.reportingService.logs.length > 0) {
            const profitLog = `Profit ${this.scoreKeeperService.total}`;
            this.reportingService.addAuditLog(null, profitLog);
            this.reportingService.exportAuditHistory();
            this.setProfitLoss();
            this.scoreKeeperService.resetTotal();
            this.resetCart();
            setTimeout(this.developStrategy, 10800000);
          }
        } else if (moment().isAfter(moment(startStopTime.startDateTime)) &&
          moment().isBefore(moment(startStopTime.endDateTime))) {
          if (this.isLive) {
            this.executeOrderList();
            if (this.cartService.otherOrders.length < this.maxTradeCount && (!this.lastReceivedRecommendation || Math.abs(this.lastReceivedRecommendation.diff(moment(), 'minutes')) > 5)) {
              this.findDaytradeService.getRefreshObserver().next(true);
            } else {
              this.cartService.removeCompletedOrders();
              this.cartService.otherOrders.forEach(order => {
                if (order.side.toLowerCase() === 'daytrade' && 
                moment(order.createdTime).diff(moment(), 'minutes') > 60 &&
                order.positionCount === 0) {
                  this.cartService.deleteDaytrade(order);
                }
              });
            }
          } else if (!this.lastMarketHourCheck || this.lastMarketHourCheck.diff(moment(), 'hours') > 1) {
            this.portfolioService.getEquityMarketHours(moment().format('YYYY-MM-DD'))
              .subscribe((marketHour: any) => {
                if (marketHour && marketHour.equity && (marketHour.equity?.equity?.isOpen || marketHour.equity?.EQ?.isOpen)) {
                  this.isLive = true;
                } else {
                  this.lastMarketHourCheck = moment();
                  this.isLive = false;
                }
              });
          }
        } else if (Math.abs(moment().diff(moment(startStopTime.startDateTime, 'hours'))) > 9 && moment().diff(this.lastInterval, 'minutes') > 2) {
          console.log('Running backtest at', moment().format(), ' start time:', startStopTime.startDateTime);
          this.runBackTest();
          this.lastInterval = moment();
          this.startFindingTrades();
        }

        // if (this.cartService.otherOrders.length + this.cartService.buyOrders.length + this.cartService.sellOrders.length < this.maxTradeCount) {
        //   const randomDaytradeStock = this.machineDaytradingService.getNextStock();
        //   const prediction = await this.getPrediction(randomDaytradeStock);
        //   if (prediction > 0.8) {
        //     try {
        //       const backtestDate = this.getLastTradeDate();
        //       const trainingResults = await this.machineDaytradingService.trainStock(randomDaytradeStock, backtestDate.subtract({ days: 3 }).format('YYYY-MM-DD'), backtestDate.add({ days: 2 }).format('YYYY-MM-DD'));
        //       console.log(`Intraday training results for ${randomDaytradeStock} Correct: ${trainingResults[0].correct} Guesses: ${trainingResults[0].guesses}`);
        //       if (trainingResults[0].correct / trainingResults[0].guesses > 0.6 && trainingResults[0].guesses > 23) {
        //         const lastProfitLoss = JSON.parse(localStorage.getItem('profitLoss'));
        //         if (!(lastProfitLoss && lastProfitLoss.profitRecord !== undefined && lastProfitLoss.profitRecord[randomDaytradeStock] && lastProfitLoss.profitRecord[randomDaytradeStock] < 10)) {
        //           const trainingMsg = `Day trade training results correct: ${trainingResults[0].correct}, guesses: ${trainingResults[0].guesses}`;
        //           this.reportingService.addAuditLog(randomDaytradeStock, trainingMsg);
        //           await this.addDaytrade(randomDaytradeStock);
        //         }
        //       } else {
        //         await this.addBuy(this.createHoldingObj(randomDaytradeStock));
        //       }
        //     } catch (error) {
        //       console.log('error getting training results ', error);
        //     }
        //   }
        // }
      });
  }

  calculatePl(records) {
    let profit = 0;
    for (let key in records) {
      if (records[key]) {
        profit += Number(records[key].toFixed(2));
      }
    }

    return profit;
  }

  setProfitLoss() {
    const tempProfitRecord = this.scoreKeeperService.profitLossHash;

    const profit = this.calculatePl(tempProfitRecord);

    const profitObj: ProfitLossRecord = {
      'date': moment().format(),
      profit: profit,
      lastStrategy: this.strategyList[this.strategyCounter],
      lastRiskTolerance: this.riskCounter,
      profitRecord: tempProfitRecord
    };
    localStorage.setItem('profitLoss', JSON.stringify(profitObj));
  }

  stop() {
    this.display = false;
    this.timer.unsubscribe();
    this.cleanUp();
    this.messageService.add({
      severity: 'danger',
      summary: 'Autopilot stopped'
    });
  }

  resetCart() {
    this.executedIndex = 0;
    this.lastOrderListIndex = 0;
    this.cartService.removeCompletedOrders();
  }

  decreaseRiskTolerance() {
    if (this.riskCounter > 0) {
      this.riskCounter--;
    }
    this.changeStrategy();
  }

  decreaseDayTradeRiskTolerance() {
    if (this.dayTradeRiskCounter > 0) {
      this.dayTradeRiskCounter = 0;
    }
    this.changeStrategy();
  }

  increaseRiskTolerance() {
    if (this.riskCounter < this.riskToleranceList.length - 1) {
      this.riskCounter++;
    }
    console.log(`Increase risk to ${this.riskCounter}`);
  }

  increaseDayTradeRiskTolerance() {
    if (this.dayTradeRiskCounter < this.dayTradingRiskToleranceList.length - 1) {
      this.dayTradeRiskCounter++;
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
      severity: 'info',
      summary: `Strategy changed to ${strat}`
    });
    console.log(`Strategy changed to ${strat}. Risk tolerance ${this.riskCounter}`);
  }

  async developStrategy() {
    this.machineLearningService.getFoundPatterns()
      .subscribe(patternsResponse => console.log('found patterns ', patternsResponse));

    await this.checkCurrentPositions();
    this.setProfitLoss();

    const lastProfitLoss = JSON.parse(localStorage.getItem('profitLoss'));
    if (lastProfitLoss && lastProfitLoss.profit !== undefined) {
      if (Number(this.calculatePl(lastProfitLoss.profitRecord)) < 0) {
        if (lastProfitLoss.lastStrategy === Strategy.Daytrade) {
          this.increaseDayTradeRiskTolerance();
        } else {
          this.decreaseRiskTolerance();
        }

      } else if (Number(this.calculatePl(lastProfitLoss.profitRecord)) > 0) {
        if (lastProfitLoss.lastStrategy === Strategy.Daytrade) {
          this.decreaseDayTradeRiskTolerance();
        } else {
          this.increaseRiskTolerance();
        }
      } else {
        try {
          const backtestResults = await this.backtestTableService.getBacktestData('SH');

          if (backtestResults && backtestResults.ml > 0.7) {
            this.decreaseRiskTolerance();
            this.increaseDayTradeRiskTolerance();
          } else {
            this.increaseRiskTolerance();
            this.decreaseDayTradeRiskTolerance();
          }
        } catch (error) {
          console.log(error);
        }
      }
    }
    // await this.getNewTrades();
  }

  async getNewTrades(strategy = this.strategyList[this.strategyCounter]) {
    this.findPatternService.buildTargetPatterns();
    //this.checkPersonalLists();
    switch (strategy) {
      case Strategy.Swingtrade: {
        const callback = async (symbol: string, mlResult: number, backtestData) => {
          if (mlResult > 0.65) {

            if (backtestData?.optionsVolume > 1000) {
              const optionStrategy = await this.backtestTableService.getCallTrade(symbol);
              const price = this.backtestTableService.findOptionsPrice(optionStrategy.call.bid, optionStrategy.call.ask) + this.backtestTableService.findOptionsPrice(optionStrategy.put.bid, optionStrategy.put.ask);
              this.backtestTableService.addStrangle(symbol, price, optionStrategy);
            } else {
              const stock: PortfolioInfoHolding = {
                name: symbol,
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
              await this.addBuy(stock);
              const log = `Adding swing trade ${stock.name}`;
              this.reportingService.addAuditLog(null, log);
            }
          }
        };

        this.findSwingtrades(callback);
        break;
      }
      case Strategy.DaytradeFullList: {
        const callback = async (symbol: string, prediction: number) => {
          const stock: PortfolioInfoHolding = {
            name: symbol,
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
          if (prediction > 0.5) {
            await this.addBuy(stock);
            const log = `Adding swing trade ${stock.name}`;
            this.reportingService.addAuditLog(null, log);
          } else if (prediction < 0.4) {
            const sellHolding = this.currentHoldings.find(holdingInfo => {
              return holdingInfo.name === stock.name;
            });
            if (sellHolding) {
              this.portfolioSell(sellHolding);
            }
          }
        };

        this.findSwingtrades(callback, Stocks);
        break;
      }
      case Strategy.StateMachine:
        this.findPatternService.developStrategy();
        break;
      case Strategy.DaytradeShort: {
        this.findDaytradeShort();
        break;
      }
      case Strategy.TrimHoldings: {
        this.trimHoldings();
        break;
      }
      case Strategy.Short: {

      }
      case Strategy.MLSpy:
        try {
          const backtestResults = await this.backtestTableService.getBacktestData('SH');
          if (backtestResults && backtestResults.ml > 0.6) {
            this.addBuy(this.createHoldingObj('SH'));
            const sellHolding = this.currentHoldings.find(holdingInfo => {
              return holdingInfo.name === 'TQQQ';
            });
            if (sellHolding) {
              this.portfolioSell(sellHolding);
            }
          } else {
            this.addBuy(this.createHoldingObj('TQQQ'));
            const sellHolding = this.currentHoldings.find(holdingInfo => {
              return holdingInfo.name === 'SH';
            });
            if (sellHolding) {
              this.portfolioSell(sellHolding);
            }
          }
        } catch (error) {
          console.log(error);
        }
        break;
      default: {
        const callback = async (symbol: string, prediction: number, backtestData: any) => {
          if (prediction > 0.5) {
            const stock: PortfolioInfoHolding = {
              name: symbol,
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
            const backtestDate = this.getLastTradeDate();
            try {
              const trainingResults = await this.machineDaytradingService.trainStock(stock.name, backtestDate.subtract({ days: 3 }).format('YYYY-MM-DD'), backtestDate.add({ days: 2 }).format('YYYY-MM-DD'));
              console.log(`Intraday training results for ${stock.name} Correct: ${trainingResults[0].correct} Guesses: ${trainingResults[0].guesses}`);
              if (trainingResults[0].correct / trainingResults[0].guesses > 0.6 && trainingResults[0].guesses > 23) {
                const lastProfitLoss = JSON.parse(localStorage.getItem('profitLoss'));
                if (!(lastProfitLoss && lastProfitLoss.profitRecord && lastProfitLoss.profitRecord[stock.name] && lastProfitLoss.profitRecord[stock.name] < 10)) {
                  const trainingMsg = `Day trade training results correct: ${trainingResults[0].correct}, guesses: ${trainingResults[0].guesses}`;
                  this.reportingService.addAuditLog(stock.name, trainingMsg);
                  await this.addDaytrade(stock.name);
                }
              } else {
                console.log('backtestData 0', backtestData);

                if (backtestData?.optionsVolume > 1000) {
                  const optionStrategy = await this.backtestTableService.getCallTrade(symbol);
                  const price = this.backtestTableService.findOptionsPrice(optionStrategy.call.bid, optionStrategy.call.ask) + this.backtestTableService.findOptionsPrice(optionStrategy.put.bid, optionStrategy.put.ask);
                  this.backtestTableService.addStrangle(symbol, price, optionStrategy);
                } else {
                  await this.addBuy(stock);
                }
              }
            } catch (error) {
              console.log('error getting training results ', error);
            }
          }
        };

        this.findSwingtrades(callback);
        break;
      }
    }
  }

  createHoldingObj(name: string) {
    return {
      name,
      symbol: name,
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
  }

  isBuyPrediction(prediction: { label: string, value: AiPicksPredictionData[] }) {
    if (prediction) {
      let predictionSum = 0;
      for (const p of prediction.value) {
        predictionSum += p.prediction;
      }

      if (predictionSum / prediction.value.length > 0.7) {
        return true;
      } else if (predictionSum / prediction.value.length < 0.3) {
        return false;
      }
    }
    return null;
  }

  async backtestList(cb = async (stock: any, mlResult: number) => { }, stockList: (PortfolioInfoHolding[] | any[]) = CurrentStockList) {
    stockList.forEach(async (stock) => {
      const backtestResults = await this.backtestTableService.getBacktestData(stock.name);
      if (backtestResults) {
        cb(stock, backtestResults.ml);
      }
    });
  }

  runBackTest() {
    const stock = this.machineDaytradingService.getNextStock();
    this.backtestTableService.getBacktestData(stock);
  }

  async findSwingtrades(cb = async (stock: string, mlResult: number, backtestResults: any) => { }, stockList: (PortfolioInfoHolding[] | any[]) = CurrentStockList) {
    if (stockList) {
      this.machineDaytradingService.setCurrentStockList(stockList);
    } else {
      if (!this.machineDaytradingService.getCurrentStockList()) {
        this.machineDaytradingService.setCurrentStockList(CurrentStockList);
      }
    }
    let stock;
    const found = (name) => {
      return Boolean(this.currentHoldings.find((value) => value.name === name));
    };
    let counter = this.machineDaytradingService.getCurrentStockList().length;
    while (counter > 0 && (this.cartService.buyOrders.length + this.cartService.otherOrders.length) < this.maxTradeCount) {
      do {
        stock = this.machineDaytradingService.getNextStock();
      } while (found(stock))
      const backtestResults = await this.backtestTableService.getBacktestData(stock);
      if (backtestResults) {
        cb(stock, backtestResults.ml, backtestResults);
      }
      counter--;
    }
  }

  async findDaytradeShort() {
    console.log('finding bearish day trade');

    let idx = 0;
    while (idx < BearList.length) {
      idx++;
      const stock = BearList[idx].ticker;
      const backtestDate = this.getLastTradeDate();
      console.log('last date', backtestDate);
      const trainingResults = await this.machineDaytradingService.trainStock(stock, backtestDate.subtract({ days: 1 }).format('YYYY-MM-DD'), backtestDate.add({ days: 1 }).format('YYYY-MM-DD'));
      console.log('training daytrade results ', trainingResults);
      if (trainingResults[0].correct / trainingResults[0].guesses > 0.6 && trainingResults[0].guesses > 50) {
        await this.addDaytrade(stock);
        if ((this.cartService.buyOrders.length + this.cartService.otherOrders.length) > this.maxTradeCount) {
          break;
        }
      }
    }
    this.setLoading(false);
  }

  triggerBacktestNext() {
    this.backtestBuffer$.next();
  }

  async addBuy(holding: PortfolioInfoHolding, allocation = round(this.riskToleranceList[this.riskCounter], 2)) {
    if ((this.cartService.buyOrders.length + this.cartService.otherOrders.length) < this.maxTradeCount) {
      console.log('Adding buy ', holding);

      const currentDate = moment().format('YYYY-MM-DD');
      const startDate = moment().subtract(100, 'days').format('YYYY-MM-DD');
      try {
        const indicators = await this.getTechnicalIndicators(holding.name, startDate, currentDate, this.currentHoldings).toPromise();
        const thresholds = this.getStopLoss(indicators.low, indicators.high);
        await this.portfolioBuy(holding,
          allocation,
          thresholds.profitTakingThreshold,
          thresholds.stopLoss);
      } catch (error) {
        console.log('Error getting backtest data for ', holding.name, error);
        await this.portfolioBuy(holding,
          round(this.riskToleranceList[this.riskCounter], 2),
          null,
          null);
      }
    } else {
      console.log('Tried to add buy order but too many orders', holding);

      this.unsubscribeStockFinder();
    }
  }

  async addDaytrade(stock: string) {
    if ((this.cartService.buyOrders.length + this.cartService.otherOrders.length) < this.maxTradeCount) {
      const currentDate = moment().format('YYYY-MM-DD');
      const startDate = moment().subtract(100, 'days').format('YYYY-MM-DD');
      try {
        const indicators = await this.getTechnicalIndicators(stock, startDate, currentDate, this.currentHoldings).toPromise();
        const thresholds = this.getStopLoss(indicators.low, indicators.high);
        await this.portfolioDaytrade(stock,
          round(this.dayTradingRiskToleranceList[this.dayTradeRiskCounter], 2),
          thresholds.profitTakingThreshold,
          thresholds.stopLoss);
      } catch (error) {
        console.log('Error getting backtest data for daytrade', stock, error);
        await this.portfolioDaytrade(stock,
          round(this.dayTradingRiskToleranceList[this.dayTradeRiskCounter], 2),
          null,
          null);
      }
    } else {
      this.unsubscribeStockFinder();
    }
  }

  initializeOrder(order: SmartOrder) {
    order.stopped = false;
    const queueItem: AlgoQueueItem = {
      symbol: order.holding.symbol,
      reset: true
    };

    this.tradeService.algoQueue.next(queueItem);
  }

  initializeOrders() {
    const concat = this.cartService.sellOrders.concat(this.cartService.buyOrders);
    const orders = concat.concat(this.cartService.otherOrders);
    orders.forEach((order: SmartOrder) => {
      this.initializeOrder(order);
    });
  }

  executeOrderList() {
    const concat = this.cartService.sellOrders.concat(this.cartService.buyOrders);
    const orders = concat.concat(this.cartService.otherOrders);
    const limit = this.simultaneousOrderLimit > orders.length ? orders.length : this.simultaneousOrderLimit;

    while (this.executedIndex < limit && this.lastOrderListIndex < orders.length) {
      const queueItem: AlgoQueueItem = {
        symbol: orders[this.lastOrderListIndex].holding.symbol,
        reset: false
      };

      setTimeout(() => {
        this.tradeService.algoQueue.next(queueItem);
      }, 500 * this.lastOrderListIndex);
      this.lastOrderListIndex++;
      this.executedIndex++;
    }
    if (this.lastOrderListIndex >= orders.length) {
      this.lastOrderListIndex = 0;
    }
    if (this.executedIndex >= limit) {
      setTimeout(() => {
        this.executedIndex = 0;
      }, 500);
    }
  }

  getLastTradeDate() {
    return this.globalSettingsService.getLastTradeDate();
  }

  setLoading(value: boolean) {
    this.isLoading = value;
  }

  async checkCurrentPositions() {
    await this.authenticationService.checkCredentials(this.authenticationService?.selectedTdaAccount?.accountId).toPromise();
    this.currentHoldings = [];
    const currentDate = moment().format('YYYY-MM-DD');
    const startDate = moment().subtract(365, 'days').format('YYYY-MM-DD');
    this.setLoading(true);
    const balance: any = await this.portfolioService.getTdBalance().toPromise();
    const totalValue = balance.buyingPower;

    const data = await this.portfolioService.getTdPortfolio()
      .pipe(
        finalize(() => this.setLoading(false))
      ).toPromise();

    if (data) {
      for (const holding of data) {
        if (holding.instrument.assetType.toLowerCase() !== 'option') {
          const stock = holding.instrument.symbol;
          // let pl;
          // if (holding.instrument.assetType.toLowerCase() === 'option') {
          //   pl = holding.marketValue - (holding.averagePrice * holding.longQuantity) * 100;
          // } else {
          //   pl = holding.marketValue - (holding.averagePrice * holding.longQuantity);
          // }
          const pl = holding.marketValue - (holding.averagePrice * holding.longQuantity);

          const tempHoldingObj = {
            name: stock,
            pl,
            netLiq: holding.marketValue,
            shares: holding.longQuantity,
            alloc: (holding.averagePrice * holding.longQuantity) / totalValue,
            recommendation: null,
            buyReasons: '',
            sellReasons: '',
            buyConfidence: 0,
            sellConfidence: 0,
            prediction: null
          }
          this.scoreKeeperService.addProfitLoss(tempHoldingObj.name, Number(tempHoldingObj.pl), false);
          this.currentHoldings.push(tempHoldingObj);
          await this.checkStopLoss(tempHoldingObj);

          if (holding.instrument.assetType.toLowerCase() === 'equity') {
            const indicators = await this.getTechnicalIndicators(holding.instrument.symbol,
              startDate,
              currentDate,
              this.currentHoldings,
              true).toPromise();
            const foundIdx = this.currentHoldings.findIndex((value) => {
              return value.name === stock;
            });
            this.currentHoldings[foundIdx].recommendation = indicators.recommendation.recommendation;
            const reasons = this.getRecommendationReason(indicators.recommendation);
            this.currentHoldings[foundIdx].buyReasons = reasons.buyReasons;
            this.currentHoldings[foundIdx].sellReasons = reasons.sellReasons;
            try {
              const backtestResults = await this.backtestTableService.getBacktestData(stock);

              if (backtestResults && backtestResults.ml > 0.7) {
                await this.addBuy(this.createHoldingObj(stock));
              } else if (backtestResults && backtestResults.ml < 0.3) {
                const sellHolding = this.currentHoldings.find(holdingInfo => {
                  return holdingInfo.name === stock;
                });
                if (sellHolding) {
                  this.portfolioSell(sellHolding);
                }
              }
            } catch (error) {
              console.log(error);
            }
          }
        }
      }
      // this.checkIfTooManyHoldings(this.currentHoldings);
      console.log('current holdings', this.currentHoldings);
    }
  }

  getTechnicalIndicators(stock: string, startDate: string, currentDate: string, holdings, triggerBuySell = false) {
    return this.backtestService.getBacktestEvaluation(stock, startDate, currentDate, 'daily-indicators')
      .map((indicatorResults: BacktestResponse) => {
        if (triggerBuySell) {
          this.getIndicatorScore(stock, indicatorResults.signals, holdings);
        }
        return indicatorResults.signals[indicatorResults.signals.length - 1];
      });
  }

  getIndicatorScore(stock, signals, holdings) {
    this.dailyBacktestService.getSignalScores(signals).subscribe((score) => {
      const foundIdx = holdings.findIndex((value) => {
        return value.name === stock;
      });

      if (!holdings[foundIdx]) {
        return;
      }

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

  trimHoldings() {
    const callback = async (symbol: string, prediction: number) => {
      const stock: PortfolioInfoHolding = {
        name: symbol,
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
      if (prediction > 0.7) {
        await this.addBuy(stock);
        const log = `Adding swing trade ${stock.name}`;
        this.reportingService.addAuditLog(null, log);
      } else if (prediction < 0.4) {
        const sellHolding = this.currentHoldings.find(holdingInfo => {
          return holdingInfo.name === stock.name;
        });
        if (sellHolding) {
          this.portfolioSell(sellHolding);
        }
      }
    };

    this.backtestList(callback, this.currentHoldings);
  }

  async analyseRecommendations(holding: PortfolioInfoHolding) {
    if (holding.recommendation.toLowerCase() === 'buy') {
      await this.addBuy(holding);
    } else if (holding.recommendation.toLowerCase() === 'sell') {
      this.portfolioSell(holding);
    }
  }

  async checkStopLoss(holding: PositionHoldings) {
    const percentLoss = divide(holding.pl, holding.netLiq);
    if (percentLoss < -0.045) {
      this.portfolioSell(holding);
    }
  }

  checkIfTooManyHoldings(currentHoldings: any[]) {
    if (currentHoldings.length > this.maxTradeCount) {
      currentHoldings.sort((a, b) => a.pl - b.pl);
      const toBeSold = currentHoldings.slice(0, 1);
      console.log('too many holdings. selling', toBeSold, 'from', currentHoldings);
      toBeSold.forEach(holdingInfo => {
        console.log('selling ', holdingInfo);
        this.portfolioSell(holdingInfo);
      });
    }
  }

  buildOrder(symbol: string, quantity = 0, price = 0,
    side = 'DayTrade', orderSizePct = 0.5, lossThreshold = -0.004,
    profitTarget = 0.008, trailingStop = -0.003, allocation = null): SmartOrder {
    return {
      holding: {
        instrument: null,
        symbol,
      },
      quantity,
      price,
      submitted: false,
      pending: false,
      orderSize: floor(quantity * orderSizePct) || 1,
      side,
      lossThreshold: lossThreshold,
      profitTarget: profitTarget,
      trailingStop: trailingStop,
      useStopLoss: true,
      useTrailingStopLoss: true,
      useTakeProfit: true,
      sellAtClose: side.toUpperCase() === 'SELL' ? true : false,
      // sellAtClose: false,
      allocation
    };
  }

  getAllocationPct(totalAllocationPct: number = 0.1, numberOfOrders: number) {
    return round(divide(totalAllocationPct, numberOfOrders), 2);
  }

  async portfolioSell(holding: PortfolioInfoHolding) {
    const price = await this.portfolioService.getPrice(holding.name).toPromise();
    const orderSizePct = 0.5;
    const order = this.buildOrder(holding.name, holding.shares, price, 'Sell',
      orderSizePct, null, null, null);
    this.cartService.addToCart(order, true);
    this.initializeOrder(order);
  }

  async buildBuyOrder(holding: PortfolioInfoHolding,
    allocation: number,
    profitThreshold: number = null,
    stopLossThreshold: number = null,
    useCashBalance = false) {
    const price = await this.portfolioService.getPrice(holding.name).toPromise();
    const balance = await this.portfolioService.getTdBalance().toPromise();
    const quantity = this.getQuantity(price, allocation, useCashBalance ? balance.cashBalance : balance.availableFunds);
    const orderSizePct = (this.riskToleranceList[this.riskCounter] > 0.5) ? 0.5 : 0.3;
    const order = this.buildOrder(holding.name, quantity, price, 'Buy',
      orderSizePct, stopLossThreshold, profitThreshold,
      stopLossThreshold, allocation);
    return order;
  }

  async portfolioBuy(holding: PortfolioInfoHolding,
    allocation: number,
    profitThreshold: number = null,
    stopLossThreshold: number = null) {
    const order = await this.buildBuyOrder(holding, allocation, profitThreshold, stopLossThreshold);
    this.cartService.addToCart(order);
    this.initializeOrder(order);
  }

  async portfolioDaytrade(symbol: string,
    allocation: number,
    profitThreshold: number = null,
    stopLossThreshold: number = null) {
    const price = await this.portfolioService.getPrice(symbol).toPromise();
    const data = await this.portfolioService.getTdBalance().toPromise();
    const quantity = this.getQuantity(price, allocation, data.availableFunds);
    const orderSizePct = 0.5;
    const order = this.buildOrder(symbol,
      quantity,
      price,
      'DayTrade',
      orderSizePct,
      stopLossThreshold,
      profitThreshold,
      stopLossThreshold,
      allocation);
    console.log('add day trade: ', order);
    this.cartService.addToCart(order);
    this.initializeOrder(order);
  }

  private getQuantity(stockPrice: number, allocationPct: number, total: number) {
    const totalCost = round(total * allocationPct, 2);
    return Math.ceil(totalCost / stockPrice);
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

  scroll() {
    document.getElementById('#autopilot-toolbar').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  runFindPattern() {
    this.findPatternService.developStrategy();
  }

  private getStopLoss(low: number, high: number) {
    const profitTakingThreshold = round(((high / low) - 1) / 2, 4);
    const stopLoss = profitTakingThreshold * -1;
    return {
      profitTakingThreshold,
      stopLoss
    }
  }

  checkPersonalLists() {
    PersonalBullishPicks.forEach(async (stock) => {
      const name = stock.ticker;
      try {
        const backtestResults = await this.backtestTableService.getBacktestData(stock.ticker);

        if (backtestResults && backtestResults.ml > 0.5) {
          await this.addBuy(this.createHoldingObj(name));
        }
      } catch (error) {
        console.log(error);
      }
    });

    PersonalBearishPicks.forEach(async (stock) => {
      const name = stock.ticker;
      try {
        const backtestResults = await this.backtestTableService.getBacktestData(stock.ticker);

        if (backtestResults && backtestResults.ml < 0.4) {
          const sellHolding = this.currentHoldings.find(holdingInfo => {
            return holdingInfo.name === name;
          });
          if (sellHolding) {
            this.portfolioSell(sellHolding);
          }
        }
      } catch (error) {
        console.log(error);
      }
    });
  }

  removeStrategy(item) {
    console.log('TODO remove', item);
    this.strategies = this.strategies.filter(s => s.key !== item.key || s.name !== item.name || s.date !== item.date);
    this.backtestTableService.removeTradingStrategy(item);
  }

  addOptions() {
    this.dialogService.open(AddOptionsTradeComponent, {
      header: 'Add options trade',
      contentStyle: { 'overflow-y': 'unset' }
    });
  }


  async buyAtClose() {
    const backtestResults = await this.backtestTableService.getBacktestData('TQQQ');
    if (backtestResults) {
      const stock: PortfolioInfoHolding = {
        name: 'TQQQ',
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
      const order = await this.buildBuyOrder(stock, backtestResults.ml, null, null, true);
      this.daytradeService.sendBuy(order, 'limit', () => { }, () => { });
    }
  }

  startFindingTrades() {
    this.backtestTableService.findTrades();
    this.strategies = this.backtestTableService.getTradingStrategies();
    if (this.strategies.length) {
      this.revealPotentialStrategy = true;
    }
    return this.revealPotentialStrategy;
  }

  unsubscribeStockFinder() {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  cleanUp() {
    this.resetCart();
    if (this.destroy$) {
      this.destroy$.next();
      this.destroy$.complete();
    }
    if (this.backtestBuffer$) {
      this.backtestBuffer$.unsubscribe();
    }
  }

  ngOnDestroy() {
    this.cleanUp();
  }
}
