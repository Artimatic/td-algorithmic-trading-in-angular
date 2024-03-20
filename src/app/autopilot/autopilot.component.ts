import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { TimerObservable } from 'rxjs-compat/observable/TimerObservable';
import { finalize, takeUntil, take } from 'rxjs/operators';
import * as moment from 'moment-timezone';
import { AiPicksService, AuthenticationService, BacktestService, CartService, MachineLearningService, PortfolioInfoHolding, PortfolioService, ReportingService, ScoreKeeperService, TradeService } from '@shared/services';
import { SchedulerService } from '@shared/service/scheduler.service';
import { BacktestResponse } from '../rh-table';
import { SmartOrder } from '@shared/index';
import { divide, floor, round } from 'lodash';
import { DailyBacktestService } from '@shared/daily-backtest.service';
import { MessageService } from 'primeng/api';
import { AlgoQueueItem } from '@shared/services/trade.service';
import { ScoringIndex } from '@shared/services/score-keeper.service';
import { MachineDaytradingService } from '../machine-daytrading/machine-daytrading.service';
import { BearList, PrimaryList, PersonalBullishPicks, PersonalBearishPicks, OldList } from '../rh-table/backtest-stocks.constant';
import { AiPicksPredictionData } from '@shared/services/ai-picks.service';
import Stocks from '../rh-table/backtest-stocks.constant';
import { FindPatternService } from '../strategies/find-pattern.service';
import { GlobalSettingsService } from '../settings/global-settings.service';

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
  MLSpy = 'MLSpy'
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
  styleUrls: ['./autopilot.component.css']
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
  maxTradeCount = 8;
  strategyList = [
    Strategy.MLSpy,
    // Strategy.SingleStockPick,
    // Strategy.StateMachine,
    Strategy.Swingtrade,
    Strategy.Daytrade,
    Strategy.TrimHoldings,
    // Strategy.InverseSwingtrade,
    Strategy.DaytradeShort,
    Strategy.Short,
    Strategy.DaytradeFullList
  ];

  bearishStrategy = [
    Strategy.MLSpy,
    Strategy.TrimHoldings,
    Strategy.DaytradeShort,
    Strategy.Short
  ];

  riskCounter = 1;
  dayTradeRiskCounter = 0;

  riskToleranceList = [
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

  isTradingStarted = false;
  simultaneousOrderLimit = 3;
  executedIndex = 0;
  lastOrderListIndex = 0;

  lastMarketHourCheck = null;
  isLive = false;

  unsubscribe$ = new Subject();

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
    private machineDaytradingService: MachineDaytradingService,
    private findPatternService: FindPatternService,
    private machineLearningService: MachineLearningService,
    private globalSettingsService: GlobalSettingsService
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
  }

  open() {
    this.destroy$ = new Subject();
    if (this.backtestBuffer$) {
      this.backtestBuffer$.unsubscribe();
    }
    this.backtestBuffer$ = new Subject();

    this.display = true;
    this.startNewInterval();
    this.interval = Math.abs(moment(this.getStartStopTime().startDateTime).diff(moment(), 'milliseconds'));
    this.messageService.add({
      severity: 'success',
      summary: 'Autopilot started'
    });
  }

  startNewInterval() {
    this.developStrategy();
    this.timer = TimerObservable.create(0, this.interval)
      .pipe(takeUntil(this.destroy$))
      .subscribe(async () => {
        const startStopTime = this.getStartStopTime();

        if (moment().isAfter(moment(startStopTime.endDateTime).subtract(5, 'minutes')) &&
          moment().isBefore(moment(startStopTime.endDateTime))) {
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
            if (this.isTradingStarted) {
              this.executeOrderList();
              this.setProfitLoss();
            } else {
              setTimeout(() => {
                this.initializeOrders();
                this.isTradingStarted = true;
              }, this.defaultInterval);
            }
          } else if (!this.lastMarketHourCheck || this.lastMarketHourCheck.diff(moment(), 'hours') > 1) {
            this.portfolioService.getEquityMarketHours(moment().format('YYYY-MM-DD'))
              .subscribe((marketHour: any) => {
                if (marketHour.equity.EQ.isOpen) {
                  this.isLive = true;
                } else {
                  this.lastMarketHourCheck = moment();
                  this.isLive = false;
                }
              });
          }
        }

        if (this.cartService.otherOrders.length + this.cartService.buyOrders.length + this.cartService.sellOrders.length < this.maxTradeCount) {
          const randomDaytradeStock = this.machineDaytradingService.getNextStock();
          const prediction = await this.getPrediction(randomDaytradeStock);
          if (prediction > 0.5) {
            try {
              const backtestDate = this.getLastTradeDate();
              const trainingResults = await this.machineDaytradingService.trainStock(randomDaytradeStock, backtestDate.subtract({ days: 3 }).format('YYYY-MM-DD'), backtestDate.add({ days: 2 }).format('YYYY-MM-DD'));
              console.log(`Intraday training results for ${randomDaytradeStock} Correct: ${trainingResults[0].correct} Guesses: ${trainingResults[0].guesses}`);
              if (trainingResults[0].correct / trainingResults[0].guesses > 0.6 && trainingResults[0].guesses > 23) {
                const lastProfitLoss = JSON.parse(localStorage.getItem('profitLoss'));
                if (!(lastProfitLoss && lastProfitLoss.profitRecord !== undefined && lastProfitLoss.profitRecord[randomDaytradeStock] && lastProfitLoss.profitRecord[randomDaytradeStock] < 10)) {
                  const trainingMsg = `Day trade training results correct: ${trainingResults[0].correct}, guesses: ${trainingResults[0].guesses}`;
                  this.reportingService.addAuditLog(randomDaytradeStock, trainingMsg);
                  await this.addDaytrade(randomDaytradeStock);
                }
              } else {
                await this.addBuy(this.createHoldingObj(randomDaytradeStock));
              }
            } catch (error) {
              console.log('error getting training results ', error);
            }
          }
        }
      });
  }

  setProfitLoss() {
    const lastProfitLoss = JSON.parse(localStorage.getItem('profitLoss'));
    const tempProfitRecord = this.scoreKeeperService.profitLossHash;

    if (lastProfitLoss && lastProfitLoss.profitRecord) {
      for (const recordKey in lastProfitLoss.profitRecord) {
        if (lastProfitLoss.profitRecord[recordKey]) {
          if (tempProfitRecord[recordKey]) {
            tempProfitRecord[recordKey] += round(lastProfitLoss.profitRecord[recordKey], 2);
          }
        } else {
          if (tempProfitRecord[recordKey]) {
            tempProfitRecord[recordKey] = round(Number(lastProfitLoss.profitRecord[recordKey]), 2);
          }
        }
      }
    }
    const profitObj: ProfitLossRecord = {
      'date': moment().format(),
      profit: this.scoreKeeperService.total,
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
    this.isTradingStarted = false;
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
    const lastProfitLoss = JSON.parse(localStorage.getItem('profitLoss'));
    if (lastProfitLoss && lastProfitLoss.profit !== undefined) {
      if (Number(lastProfitLoss.profit) < 0) {
        if (lastProfitLoss.lastStrategy === Strategy.Daytrade) {
          this.increaseDayTradeRiskTolerance();
        } else {
          this.decreaseRiskTolerance();
        }

      } else if (Number(lastProfitLoss.profit) > 0) {
        if (lastProfitLoss.lastStrategy === Strategy.Daytrade) {
          this.decreaseDayTradeRiskTolerance();
        } else {
          this.increaseRiskTolerance();
        }
      } else {
        try {
          const predictionNum = await this.getPrediction('SPY');

          if (predictionNum >= 0.5) {
            this.increaseRiskTolerance();
          } else {
            while (!this.bearishStrategy.find(bearStrat => bearStrat === this.strategyList[this.strategyCounter])) {
              this.changeStrategy();
            }
            this.getNewTrades(this.strategyList[this.strategyCounter]);
          }
        } catch (error) {
          console.log(error);
        }
      }
    }


    await this.checkCurrentPositions();
    await this.getNewTrades();
  }

  async getNewTrades(strategy = this.strategyList[this.strategyCounter]) {
    this.findPatternService.buildTargetPatterns();
    this.checkPersonalLists();
    switch (strategy) {
      case Strategy.Swingtrade: {
        const callback = async (mlResult: { label: string, value: AiPicksPredictionData[] }) => {
          if (this.isBuyPrediction(mlResult)) {
            const stock: PortfolioInfoHolding = {
              name: mlResult.label,
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
        };

        this.findSwingtrades(callback);
        break;
      }
      case Strategy.DaytradeFullList: {
        const callback = async (mlResult: { label: string, value: AiPicksPredictionData[] }) => {
          const stock: PortfolioInfoHolding = {
            name: mlResult.label,
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
          const prediction = this.isBuyPrediction(mlResult);
          if (prediction) {
            await this.addBuy(stock);
            const log = `Adding swing trade ${stock.name}`;
            this.reportingService.addAuditLog(null, log);
          } else if (prediction === false) {
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
        this.findShort();
      }
      case Strategy.MLSpy:
        try {
          const predictionNum = await this.getPrediction('SPY');

          if (predictionNum >= 0.5) {
            this.addBuy(this.createHoldingObj('TQQQ'));
            const sellHolding = this.currentHoldings.find(holdingInfo => {
              return holdingInfo.name === 'SH';
            });
            if (sellHolding) {
              this.portfolioSell(sellHolding);
            }
          } else if (predictionNum < 0.45) {
            this.addBuy(this.createHoldingObj('SH'));
            const sellHolding = this.currentHoldings.find(holdingInfo => {
              return holdingInfo.name === 'TQQQ';
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
        const callback = async (mlResult: { label: string, value: AiPicksPredictionData[] }) => {
          if (this.isBuyPrediction(mlResult)) {
            const stock: PortfolioInfoHolding = {
              name: mlResult.label,
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
                await this.addBuy(stock);
              }
            } catch (error) {
              console.log('error getting training results ', error);
            }
          }
        };

        this.findSwingtrades(callback);
        const lastProfitLoss = JSON.parse(localStorage.getItem('profitLoss'));

        if (lastProfitLoss && lastProfitLoss.profitRecord) {
          for (const recordKey in lastProfitLoss.profitRecord) {
            if (lastProfitLoss.profitRecord[recordKey] > 0) {
              await this.addDaytrade(recordKey);
            }
          }
        }
        break;
      }
    }
  }

  createHoldingObj(name: string) {
    return {
      name,
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

  findSwingtrades(cb = async (mlResult: { label: string, value: AiPicksPredictionData[] }) => { }, stockList: (PortfolioInfoHolding[] | any[]) = PrimaryList) {
    this.unsubscribeStockFinder();
    this.unsubscribe$ = new Subject();
    this.backtestBuffer$.unsubscribe();
    this.backtestBuffer$ = new Subject();

    this.machineDaytradingService.setCurrentStockList(stockList);
    this.aiPicksService.mlNeutralResults.pipe(
      takeUntil(this.unsubscribe$),
      finalize(() => {
        this.setLoading(false);
      })
    ).subscribe(async (latestMlResult: { label: string, value: AiPicksPredictionData[] }) => {
      if (latestMlResult) {
        await cb(latestMlResult);
      }

      this.schedulerService.schedule(() => {
        this.triggerBacktestNext();
      }, `findTrades`, null, false, 60000);
    }, error => {
      console.log(error);
      this.schedulerService.schedule(() => {
        this.triggerBacktestNext();
      }, `findTrades`, null, false, 60000);
    });
    this.setLoading(true);

    this.backtestBuffer$
      .pipe(takeUntil(this.unsubscribe$),
        finalize(() => this.setLoading(false))
      )
      .subscribe(() => {
        let stock;
        const found = (name) => {
          return Boolean(this.currentHoldings.find((value) => value.name === name));
        };

        do {
          stock = this.machineDaytradingService.getNextStock();
        } while (found(stock))
        this.runAi(stock);
      });
    this.triggerBacktestNext();
  }

  async getPrediction(stockSymbol: string) {
    try {
      const predictionNum = await this.aiPicksService.trainAndActivate(stockSymbol);
      return Number(predictionNum.value);
    } catch (error) {
      console.log(error);
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
        if (this.cartService.otherOrders.length > this.maxTradeCount) {
          break;
        }
      }
    }
    this.setLoading(false);
  }

  findShort() {
    let idx = 0;
    console.log('finding short');
    this.backtestBuffer$.unsubscribe();
    this.backtestBuffer$ = new Subject();
    this.aiPicksService.mlNeutralResults.pipe(
      take(BearList.length),
      finalize(() => {
        this.setLoading(false);
      })
    ).subscribe(async (latestMlResult) => {
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
        sessionStorage.setItem('lastMlResult', JSON.stringify(latestMlResult));
        await this.addBuy(stockHolding);
        const log = `Adding swing trade short ${stockHolding.name}`;
        this.reportingService.addAuditLog(stockHolding.name, log);
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
        const stock = BearList[idx++]?.ticker || null;
        console.log('run ai on ', stock);
        if (stock) {
          this.runAi(stock);
        }
      });
    this.triggerBacktestNext();
  }

  triggerBacktestNext() {
    this.backtestBuffer$.next();
  }

  async addBuy(holding: PortfolioInfoHolding, allocation = round(this.riskToleranceList[this.riskCounter], 2)) {
    if (this.cartService.buyOrders.length < this.maxTradeCount) {
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
    if (this.cartService.otherOrders.length < this.maxTradeCount) {
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

  getStartStopTime() {
    const endTime = '16:00';
    const currentMoment = moment().tz('America/New_York').set({ hour: 9, minute: 50 });
    const currentEndMoment = moment().tz('America/New_York').set({ hour: 16, minute: 0 });
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
              const predictionNum = await this.getPrediction(stock);

              if (predictionNum > 0.7) {
                await this.addBuy(this.createHoldingObj(stock));
              } else if (predictionNum < 0.3) {
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
        this.checkIfTooManyHoldings(this.currentHoldings);
        console.log('current holdings', this.currentHoldings);
      }
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
    const callback = async (mlResult: { label: string, value: AiPicksPredictionData[] }) => {
      const stock: PortfolioInfoHolding = {
        name: mlResult.label,
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
      const prediction = this.isBuyPrediction(mlResult);
      if (prediction) {
        await this.addBuy(stock);
        const log = `Adding swing trade ${stock.name}`;
        this.reportingService.addAuditLog(null, log);
      } else if (prediction === false) {
        const sellHolding = this.currentHoldings.find(holdingInfo => {
          return holdingInfo.name === stock.name;
        });
        if (sellHolding) {
          this.portfolioSell(sellHolding);
        }
      }
    };

    this.findSwingtrades(callback, this.currentHoldings);
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
  }

  async portfolioBuy(holding: PortfolioInfoHolding,
    allocation: number,
    profitThreshold: number = null,
    stopLossThreshold: number = null) {
    const price = await this.portfolioService.getPrice(holding.name).toPromise();
    const data = await this.portfolioService.getTdBalance().toPromise();
    const quantity = this.getQuantity(price, allocation, data.availableFunds);
    const orderSizePct = (this.riskToleranceList[this.riskCounter] > 0.5) ? 0.5 : 0.3;
    const order = this.buildOrder(holding.name, quantity, price, 'Buy',
      orderSizePct, stopLossThreshold, profitThreshold,
      stopLossThreshold, allocation);
    this.cartService.addToCart(order);
  }

  async portfolioDaytrade(symbol: string,
    allocation: number,
    profitThreshold: number = null,
    stopLossThreshold: number = null) {
    const price = await this.portfolioService.getPrice(symbol).toPromise();
    const data = await this.portfolioService.getTdBalance().toPromise();
    const quantity = this.getQuantity(price, allocation, data.availableFunds);
    const orderSizePct = 0.3;
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

  runAi(stockName: string) {
    this.schedulerService.schedule(() => {
      this.aiPicksService.tickerSellRecommendationQueue.next(stockName);
      this.aiPicksService.tickerBuyRecommendationQueue.next(stockName);
    }, 'portfolio_mgmt_ai');
  }

  scroll() {
    document.getElementById('#autopilot-toolbar').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  runFindPattern() {
    this.findPatternService.developStrategy();
  }

  private getStopLoss(low: number, high: number) {
    const profitTakingThreshold = round(((high / low) - 1) / 2, 4);
    const stopLoss = (round(profitTakingThreshold / 2, 4)) * -1;
    return {
      profitTakingThreshold,
      stopLoss
    }
  }

  checkPersonalLists() {
    PersonalBullishPicks.forEach(async (stock) => {
      const name = stock.ticker;
      try {
        const predictionNum = await this.getPrediction(name);
        if (predictionNum >= 0.5) {
          await this.addBuy(this.createHoldingObj(name));
        }
      } catch (error) {
        console.log(error);
      }
    });

    PersonalBearishPicks.forEach(async (stock) => {
      const name = stock.ticker;
      try {
        const predictionNum = await this.getPrediction(name);

        if (predictionNum < 0.4) {
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

  async test() {
    let counter = 0;
    const newList = [];
    while (counter < OldList.length) {
      const stock = OldList[counter].ticker;
      if (stock) {
        this.schedulerService.schedule(async () => {
          try {
            const results = await this.portfolioService.getInstrument(stock).toPromise();
            if (results[stock]) {
              if (results[stock].fundamental.marketCap > 1900) {
                newList.push(stock);
              }
            }
          } catch (err) {
            console.log(err);
          }
        }, `findTrades`, null, false, (counter * 1000));
      }

      counter++;
    }
    console.log(JSON.stringify(newList));
    this.portfolioService.getInstrument('W').subscribe((response) => {
      console.log('test123', response);
    });
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
