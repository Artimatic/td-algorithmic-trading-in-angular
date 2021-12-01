import { Component, OnInit, Input, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/merge';
import 'rxjs/add/operator/finally';
import { MatSnackBar, MatDialog } from '@angular/material';
import * as moment from 'moment';
import * as _ from 'lodash';

import { BacktestService, Stock, AlgoParam, PortfolioService } from '../shared';
import { OrderDialogComponent } from '../order-dialog/order-dialog.component';
import { Holding } from '../shared/models';
import { FormControl } from '@angular/forms';
import Stocks from './backtest-stocks.constant';
import { ChartDialogComponent } from '../chart-dialog/chart-dialog.component';
import { ChartParam } from '../shared/services/backtest.service';
import { GlobalSettingsService } from '../settings/global-settings.service';
import { OptionsDataService } from '../shared/options-data.service';
import { Subscription, Observable, Subject } from 'rxjs';
import { DailyBacktestService } from '@shared/daily-backtest.service';
import { take } from 'rxjs/operators';
import { AiPicksService } from '@shared/services/ai-picks.service';

export interface Algo {
  value: string;
  viewValue: string;
}

export interface AlgoGroup {
  disabled?: boolean;
  name: string;
  algorithm: Algo[];
}

export interface BacktestResponse extends Stock {
  stock: string;
  algo: string;
  totalTrades: number;
  total?: number;
  invested: number;
  returns: number;
  lastVolume: number;
  lastPrice: number;
  recommendation: string;
  buys?: number[];
  orderHistory?: any[];
  startDate?: string;
  endDate?: string;
  signals?: any[];
  upperResistance?: number;
  lowerResistance?: number;
}

@Component({
  selector: 'app-rh-table',
  templateUrl: './rh-table.component.html',
  styleUrls: ['./rh-table.component.scss']
})
export class RhTableComponent implements OnInit, OnChanges, OnDestroy {
  @Input() data: AlgoParam[];
  @Input() displayedColumns: string[];

  selectedRecommendation: string[];
  stockList: Stock[] = [];
  currentList: Stock[] = [];
  algoReport = this.initAlgoReport();

  additionalOptions = false;
  endDate: string;
  progressPct = 0;
  progress = 0;
  totalStocks = 0;
  interval: number;
  selectedAlgo = 'daily-indicators';
  algoControl = new FormControl();
  algoGroups: AlgoGroup[] = [
    {
      name: 'Update Database',
      algorithm: [
        { value: 'intraday', viewValue: 'Intraday Quotes' }
      ]
    },
    {
      name: 'Mean Reversion',
      algorithm: [
        { value: 'daily-indicators', viewValue: 'Daily - All Indicators' },
        { value: 'moving_average_resistance', viewValue: 'Daily - Moving Average Resistance' },
        { value: 'v3', viewValue: 'Intraday - MFI' },
        { value: 'v4', viewValue: 'Intraday - Bollinger Band' }
      ]
    }
  ];
  recommendations: any[];
  cols: any[];
  selectedColumns: any[];
  selectedStock: any;
  twoOrMoreSignalsOnly: boolean;
  tickerList = [];
  tickerBlacklist = {};
  signalScoreTable = [];

  private callChainSub: Subscription;
  private backtestBuffer: { stock: string; sub: Observable<any>; }[];
  private bufferSubject: Subject<void>;

  constructor(
    public snackBar: MatSnackBar,
    private algo: BacktestService,
    public dialog: MatDialog,
    private portfolioService: PortfolioService,
    private globalSettingsService: GlobalSettingsService,
    private optionsDataService: OptionsDataService,
    private dailyBacktestService: DailyBacktestService,
    private aiPicksService: AiPicksService) { }

  ngOnInit() {
    this.tickerList = Stocks;
    this.bufferSubject = new Subject();
    this.backtestBuffer = [];
    this.callChainSub = new Subscription();
    this.recommendations = [
      { value: 'strongbuy', label: 'Strong Buy' },
      { value: 'buy', label: 'Buy' },
      { value: 'sell', label: 'Sell' },
      { value: 'strongsell', label: 'Strong Sell' }
    ];
    this.endDate = moment(this.globalSettingsService.backtestDate).format('YYYY-MM-DD');

    this.cols = [
      { field: 'stock', header: 'Stock' },
      { field: 'returns', header: 'Returns' },
      { field: 'lastVolume', header: 'Last Volume' },
      { field: 'lastPrice', header: 'Last Price' },
      { field: 'profitableTrades', header: 'Profitable Trades' },
      { field: 'totalTrades', header: 'Trades' },
      { field: 'kellyCriterion', header: 'Trade Size' },

      { field: 'buySignals', header: 'Buy' },
      { field: 'sellSignals', header: 'Sell' },
      { field: 'upperResistance', header: 'Upper Resistance' },
      { field: 'lowerResistance', header: 'Lower Resistance' },
      { field: 'impliedMovement', header: 'Implied Movement' },
      { field: 'previousImpliedMovement', header: 'Previous IM' },
      { field: 'bearishProbability', header: 'Probability of Bear Profit' },
      { field: 'bullishProbability', header: 'Probability of Bull Profit' },

      { field: 'macdBearishShortTerm', header: 'MACD Bearish Short Term' },
      { field: 'macdBearishMidTerm', header: 'MACD Bearish Mid Term' },
      { field: 'macdBearish', header: 'MACD Bearish' },
      { field: 'macdBullishShortTerm', header: 'MACD Bullish Short Term' },
      { field: 'macdBullishMidTerm', header: 'MACD Bullish Mid Term' },
      { field: 'macdBullish', header: 'MACD Bullish' },

      { field: 'rocBearishShortTerm', header: 'ROC Bearish Short Term' },
      { field: 'rocBearishMidTerm', header: 'ROC Bearish Mid Term' },
      { field: 'rocBearish', header: 'ROC Bearish' },
      { field: 'rocBullishShortTerm', header: 'ROC Bullish Short Term' },
      { field: 'rocBullishMidTerm', header: 'ROC Bullish Mid Term' },
      { field: 'rocBullish', header: 'ROC Bullish' },

      { field: 'mfiTradeBearishShortTerm', header: 'MFI Trend Bearish Short Term' },
      { field: 'mfiTradeBearishMidTerm', header: 'MFI Trend Bearish Mid Term' },
      { field: 'mfiTradeBearish', header: 'MFI Trend Bearish' },
      { field: 'mfiTradeBullishShortTerm', header: 'MFI Trend Bullish Short Term' },
      { field: 'mfiTradeBullishMidTerm', header: 'MFI Trend Bullish Mid Term' },
      { field: 'mfiTradeBullish', header: 'MFI Trend Bullish' },

      { field: 'mfiBearishShortTerm', header: 'MFI Bearish Short Term' },
      { field: 'mfiBearishMidTerm', header: 'MFI Bearish Mid Term' },
      { field: 'mfiBearish', header: 'MFI Bearish' },
      { field: 'mfiBullishShortTerm', header: 'MFI Bullish Short Term' },
      { field: 'mfiBullishMidTerm', header: 'MFI Bullish Mid Term' },
      { field: 'mfiBullish', header: 'MFI Bullish' },

      { field: 'bbandBearishShortTerm', header: 'BBand Bearish Short Term' },
      { field: 'bbandBearishMidTerm', header: 'BBand Bearish Mid Term' },
      { field: 'bbandBearish', header: 'BBand Bearish' },
      { field: 'bbandBullishShortTerm', header: 'BBand Bullish Short Term' },
      { field: 'bbandBullishMidTerm', header: 'BBand Bullish Mid Term' },
      { field: 'bbandBullish', header: 'BBand Bullish' },

      { field: 'demark9BearishShortTerm', header: 'BBand Bearish Short Term' },
      { field: 'demark9BearishMidTerm', header: 'BBand Bearish Mid Term' },
      { field: 'demark9Bearish', header: 'BBand Bearish' },
      { field: 'demark9BullishShortTerm', header: 'BBand Bullish Short Term' },
      { field: 'demark9BullishMidTerm', header: 'BBand Bullish Mid Term' },
      { field: 'demark9Bullish', header: 'BBand Bullish' }
    ];

    this.selectedColumns = [
      { field: 'stock', header: 'Stock' },
      { field: 'buySignals', header: 'Buy' },
      { field: 'sellSignals', header: 'Sell' },
      { field: 'profitableTrades', header: 'Profitable Trades' },
      { field: 'totalTrades', header: 'Trades' },
      { field: 'returns', header: 'Returns' },
      { field: 'impliedMovement', header: 'Implied Movement' },
      { field: 'previousImpliedMovement', header: 'Previous IM' },
      { field: 'bearishProbability', header: 'Probability of Bear Profit' },
      { field: 'bullishProbability', header: 'Probability of Bull Profit' },
      { field: 'kellyCriterion', header: 'Trade Size' }
    ];

    this.selectedRecommendation = ['strongbuy', 'buy', 'sell', 'strongsell'];
    this.filter();
    this.interval = 0;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.data && changes.data.currentValue.length > 0) {
      this.interval = 0;
      this.getData(changes.data.currentValue);
    }
  }

  initAlgoReport() {
    return {
      totalReturns: 0,
      totalTrades: 0,
      averageReturns: 0,
      averageTrades: 0,
      profitableTrades: 0,
      successRate: 0,
      bullishCount: 0,
      bearishCount: 0,
      bullishBearishRatio: ''
    };
  }

  async getData(algoParams, selectedAlgo = null) {

    const currentDate = moment(this.endDate).format('YYYY-MM-DD');
    const startDate = moment(this.endDate).subtract(1000, 'days').format('YYYY-MM-DD');

    this.progress = 0;
    this.totalStocks += algoParams.length;
    this.algoReport = this.initAlgoReport();

    const algorithm = selectedAlgo ? selectedAlgo : this.selectedAlgo;

    switch (algorithm) {
      case 'v3':
        algoParams.forEach((param) => {
          this.algo.getBacktestEvaluation(param.ticker, startDate, currentDate, 'intraday').subscribe(
            result => {
              this.incrementProgress();
            }, error => {
              this.snackBar.open(`Error on ${param.ticker}`, 'Dismiss');
              this.incrementProgress();
            });
        });
        break;
      case 'v4':
        algoParams.forEach((param) => {
          this.algo.getBacktestEvaluation(param.ticker, startDate, currentDate, 'bbands').subscribe(
            result => {
              this.incrementProgress();
            }, error => {
              this.snackBar.open(`Error on ${param.ticker}`, 'Dismiss');
              this.incrementProgress();
            });
        });
        break;
      case 'intraday':
        algoParams.forEach((param) => {
          this.algo.getYahooIntraday(param.ticker)
            .subscribe(
              result => {
                this.algo.postIntraday(result).subscribe(
                  () => { }, () => {
                    this.snackBar.open(`Error on ${param.ticker}`, 'Dismiss');
                    this.incrementProgress();
                  });
              }, () => {
                this.snackBar.open(`Error on ${param.ticker}`, 'Dismiss');
                this.incrementProgress();
              });
        });
        break;
      case 'daily-indicators':
        const indicatorsCb = (param) => {
          return this.algo.getBacktestEvaluation(param.ticker, startDate, currentDate, 'daily-indicators')
            .pipe(take(1))
            .map(
              (testResults: BacktestResponse) => {
                if (testResults) {
                  const symbol = param.ticker;
                  this.scoreSignals(symbol, testResults.signals);

                  testResults.stock = symbol;
                  const indicatorResults: BacktestResponse = testResults;
                  this.updateAlgoReport(indicatorResults);

                  const lastSignal = indicatorResults.signals[indicatorResults.signals.length - 1];
                  const bullishSignals = [];
                  const bearishSignals = [];
                  for (const indicator in lastSignal.recommendation) {
                    if (lastSignal.recommendation.hasOwnProperty(indicator)) {
                      const result = {
                        algo: String(indicator),
                        recommendation: 'Neutral',
                        previousImpliedMovement: null,
                        kellyCriterion: null
                      };
                      if (lastSignal.recommendation[indicator] === 'Bullish') {
                        result.recommendation = 'Buy';
                        bullishSignals.push(indicator);
                        this.addBullCount();
                      } else if (lastSignal.recommendation[indicator] === 'Bearish') {
                        result.recommendation = 'Sell';
                        bearishSignals.push(indicator);
                        this.addBearCount();
                      }

                      result.previousImpliedMovement = this.getPreviousImpliedMove(indicatorResults.signals[indicatorResults.signals.length - 2],
                        indicatorResults.signals[indicatorResults.signals.length - 1]);

                      result.kellyCriterion = (0.7 - result.previousImpliedMovement) - ((1 - (0.7 - result.previousImpliedMovement)) / 1 + result.previousImpliedMovement);

                      const tableObj = {
                        recommendation: indicatorResults.recommendation,
                        stock: indicatorResults.stock,
                        returns: indicatorResults.returns,
                        total: indicatorResults.total,
                        invested: indicatorResults.invested,
                        profitableTrades: indicatorResults.profitableTrades,
                        totalTrades: indicatorResults.totalTrades,
                        lastVolume: indicatorResults.lastVolume || null,
                        totalReturns: indicatorResults.totalReturns || null,
                        lastPrice: indicatorResults.lastPrice || null,
                        ...result
                      };
                      this.addToList(tableObj);
                    }
                  }

                  this.getProbability(bullishSignals, bearishSignals, testResults.signals)
                    .subscribe((data) => {
                      this.findAndUpdateIndicatorScore(param.ticker, {
                        bullishProbability: data.bullishProbability,
                        bearishProbability: data.bearishProbability
                      }, this.stockList);

                      if (data.bullishProbability > 0.4 || data.bearishProbability > 0.4) {
                        this.runAi({ ...testResults, buySignals: bullishSignals, sellSignals: bearishSignals });
                      }
                    });

                  setTimeout(() => {
                    this.getImpliedMovement(testResults);
                  }, 10000);
                }
                this.incrementProgress();
              });
        };
        this.iterateAlgoParams(algoParams, indicatorsCb);
        break;
      case 'moving_average_resistance':
        const callback = (param) => {
          return this.algo.getResistanceChart(param.ticker, startDate, currentDate).map(
            (result: any) => {
              result.stock = param.ticker;
              this.addToList(result);
              this.updateAlgoReport(result);
              this.incrementProgress();
            });
        };

        this.iterateAlgoParams(algoParams, callback);
        break;
    }
  }

  private getPreviousImpliedMove(signal, alternativeSignal) {
    return signal.impliedMovement ? signal.impliedMovement : alternativeSignal.impliedMovement;
  }

  scoreSignals(stock, signals) {
    this.dailyBacktestService.getSignalScores(signals)
      .subscribe((score) => {
        const update = {
          macdBearishShortTerm: 0,
          macdBearishMidTerm: 0,
          macdBearish: 0,
          macdBullishShortTerm: 0,
          macdBullishMidTerm: 0,
          macdBullish: 0,
          rocBearishShortTerm: 0,
          rocBearishMidTerm: 0,
          rocBearish: 0,
          rocBullishShortTerm: 0,
          rocBullishMidTerm: 0,
          rocBullish: 0,
          mfiBearishShortTerm: 0,
          mfiBearishMidTerm: 0,
          mfiBearish: 0,
          mfiBullishShortTerm: 0,
          mfiBullishMidTerm: 0,
          mfiBullish: 0,
          mfiTradeBearishShortTerm: 0,
          mfiTradeBearishMidTerm: 0,
          mfiTradeBearish: 0,
          mfiTradeBullishShortTerm: 0,
          mfiTradeBullishMidTerm: 0,
          mfiTradeBullish: 0,
          bbandBearishShortTerm: 0,
          bbandBearishMidTerm: 0,
          bbandBearish: 0,
          bbandBullishShortTerm: 0,
          bbandBullishMidTerm: 0,
          bbandBullish: 0,
          demark9BearishShortTerm: 0,
          demark9BearishMidTerm: 0,
          demark9Bearish: 0,
          demark9BullishShortTerm: 0,
          demark9BullishMidTerm: 0,
          demark9Bullish: 0
        };

        if (score.macd) {
          update.macdBearishShortTerm = this.roundNumber(score.macd.bearishShortTermProfitLoss);
          update.macdBearishMidTerm = this.roundNumber(score.macd.bearishMidTermProfitLoss);
          update.macdBearish = this.roundNumber(score.macd.bearishProfitLoss);
          update.macdBullishShortTerm = this.roundNumber(score.macd.bullishShortTermProfitLoss);
          update.macdBullishMidTerm = this.roundNumber(score.macd.bullishMidTermProfitLoss);
          update.macdBullish = this.roundNumber(score.macd.bullishProfitLoss);
        }

        if (score.roc) {
          update.rocBearishShortTerm = this.roundNumber(score.roc.bearishShortTermProfitLoss);
          update.rocBearishMidTerm = this.roundNumber(score.roc.bearishMidTermProfitLoss);
          update.rocBearish = this.roundNumber(score.roc.bearishProfitLoss);
          update.rocBullishShortTerm = this.roundNumber(score.roc.bullishShortTermProfitLoss);
          update.rocBullishMidTerm = this.roundNumber(score.roc.bullishMidTermProfitLoss);
          update.rocBullish = this.roundNumber(score.roc.bullishProfitLoss);
        }

        if (score.mfiTrade) {
          update.mfiTradeBearishShortTerm = this.roundNumber(score.mfiTrade.bearishShortTermProfitLoss);
          update.mfiTradeBearishMidTerm = this.roundNumber(score.mfiTrade.bearishMidTermProfitLoss);
          update.mfiTradeBearish = this.roundNumber(score.mfiTrade.bearishProfitLoss);
          update.mfiTradeBullishShortTerm = this.roundNumber(score.mfiTrade.bullishShortTermProfitLoss);
          update.mfiTradeBullishMidTerm = this.roundNumber(score.mfiTrade.bullishMidTermProfitLoss);
          update.mfiTradeBullish = this.roundNumber(score.mfiTrade.bullishProfitLoss);
        }


        if (score.mfi) {
          update.mfiBearishShortTerm = this.roundNumber(score.mfi.bearishShortTermProfitLoss);
          update.mfiBearishMidTerm = this.roundNumber(score.mfi.bearishMidTermProfitLoss);
          update.mfiBearish = this.roundNumber(score.mfi.bearishProfitLoss);
          update.mfiBullishShortTerm = this.roundNumber(score.mfi.bullishShortTermProfitLoss);
          update.mfiBullishMidTerm = this.roundNumber(score.mfi.bullishMidTermProfitLoss);
          update.mfiBullish = this.roundNumber(score.mfi.bullishProfitLoss);
        }

        if (score.bband) {
          update.bbandBearishShortTerm = this.roundNumber(score.bband.bearishShortTermProfitLoss);
          update.bbandBearishMidTerm = this.roundNumber(score.bband.bearishMidTermProfitLoss);
          update.bbandBearish = this.roundNumber(score.bband.bearishProfitLoss);
          update.bbandBullishShortTerm = this.roundNumber(score.bband.bullishShortTermProfitLoss);
          update.bbandBullishMidTerm = this.roundNumber(score.bband.bullishMidTermProfitLoss);
          update.bbandBullish = this.roundNumber(score.bband.bullishProfitLoss);
        }

        if (score.demark9) {
          update.demark9BearishShortTerm = this.roundNumber(score.demark9.bearishShortTermProfitLoss);
          update.demark9BearishMidTerm = this.roundNumber(score.demark9.bearishMidTermProfitLoss);
          update.demark9Bearish = this.roundNumber(score.demark9.bearishProfitLoss);
          update.demark9BullishShortTerm = this.roundNumber(score.demark9.bullishShortTermProfitLoss);
          update.demark9BullishMidTerm = this.roundNumber(score.demark9.bullishMidTermProfitLoss);
          update.demark9Bullish = this.roundNumber(score.demark9.bullishProfitLoss);
        }
        this.findAndUpdateIndicatorScore(stock, update, this.stockList);
      });
  }

  roundNumber(num) {
    return _.round(num, 2);
  }

  getProbability(bullishIndicators: string[], bearishIndicators: string[], signals: any) {
    return this.dailyBacktestService.getPop(bullishIndicators, bearishIndicators, signals);
  }

  async iterateAlgoParams(algoParams: any[], callback: Function) {
    for (let i = 0; i < algoParams.length; i++) {
      if (this.isBlackListed(algoParams[i].ticker)) {
        this.snackBar.open(`Skipping blacklisted ticker: ${algoParams[i].ticker}`, 'Dismiss');
      } else {
        this.backtestBuffer.push({ stock: algoParams[i].ticker, sub: callback(algoParams[i]) });
      }
    }
    this.executeBacktests();
  }

  incrementProgress() {
    this.progress++;
    this.progressPct = this.convertToPercent(this.progress, this.totalStocks);
  }

  convertToPercent(firstVal, secondVal) {
    return +(Math.round(firstVal / secondVal).toFixed(2)) * 100;
  }

  updateAlgoReport(result: Stock) {
    this.algoReport.totalReturns += (result.returns * 100);
    this.algoReport.totalTrades += result.totalTrades;
    this.algoReport.averageReturns = +((this.algoReport.totalReturns / this.totalStocks).toFixed(5));
    this.algoReport.averageTrades = +((this.algoReport.totalTrades / this.totalStocks).toFixed(5));
    this.algoReport.profitableTrades += result.profitableTrades;
    this.algoReport.successRate = +((this.algoReport.profitableTrades / this.algoReport.totalTrades).toFixed(5));
  }

  addBullCount() {
    this.algoReport.bullishCount++;
    this.getBullishBearishRatio();
  }

  addBearCount() {
    this.algoReport.bearishCount++;
    this.getBullishBearishRatio();
  }

  getBullishBearishRatio() {
    const bullishRatio = +((this.algoReport.bullishCount / (this.algoReport.bullishCount + this.algoReport.bearishCount)).toFixed(2)) * 100;
    const bearishRatio = +((this.algoReport.bearishCount / (this.algoReport.bullishCount + this.algoReport.bearishCount)).toFixed(2)) * 100;

    this.algoReport.bullishBearishRatio = `${bullishRatio}/${bearishRatio}`;
  }

  filter() {
    this.filterRecommendation();
    if (this.twoOrMoreSignalsOnly) {
      this.filterTwoOrMoreSignalsOnly();
    }
  }

  filterTwoOrMoreSignalsOnly() {
    this.currentList = _.filter(this.currentList, (stock: Stock) => {
      return (stock.strongbuySignals.length + stock.buySignals.length +
        stock.strongsellSignals.length + stock.sellSignals.length) > 1;
    });
  }

  filterRecommendation() {
    this.currentList = [];
    if (this.selectedRecommendation.length === 0) {
      this.currentList = _.clone(this.stockList);
    } else {
      this.currentList = _.filter(this.stockList, (stock: Stock) => {
        for (const recommendation of this.selectedRecommendation) {
          if (this.hasRecommendation(stock, recommendation)) {
            return true;
          }
        }
      });
    }
  }

  hasRecommendation(stock: Stock, recommendation) {
    switch (recommendation) {
      case 'strongbuy':
        return stock.strongbuySignals.length > 0;
      case 'buy':
        return stock.buySignals.length > 0;
      case 'strongsell':
        return stock.strongsellSignals.length > 0;
      case 'sell':
        return stock.sellSignals.length > 0;
    }
  }

  addToList(stockResults: Stock) {
    this.stockList = this.findAndUpdate(stockResults, this.stockList);
    this.filter();
  }

  /*
  * Find matching stock in current list and update with new data
  */
  findAndUpdate(stock: Stock, tableList: any[]): Stock[] {
    const idx = _.findIndex(tableList, (s) => s.stock === stock.stock);
    let updateStock;
    if (idx > -1) {
      updateStock = this.updateRecommendationCount(tableList[idx], stock);
      tableList[idx] = updateStock;
    } else {
      updateStock = this.updateRecommendationCount(null, stock);
      tableList.push(updateStock);
    }
    return tableList;
  }

  findAndUpdateIndicatorScore(stock: string, update: any, tableList: any[]): Stock[] {
    const idx = _.findIndex(tableList, (s) => s.stock === stock);
    let updateStock;
    updateStock = this.updateSignalScore(tableList[idx], update);
    tableList[idx] = updateStock;
    this.filter();
    return tableList;
  }

  updateSignalScore(current: Stock, update: any) {
    return { ...current, ...update };
  }

  findStock(symbol, tableList: any[]): Stock {
    return _.find(tableList, (s) => s.stock === symbol);
  }

  updateRecommendationCount(current: Stock, incomingStock: Stock): Stock {
    if (!current) {
      current = incomingStock;
    }
    if (!current.strongbuySignals) {
      current.strongbuySignals = [];
    }
    if (!current.buySignals) {
      current.buySignals = [];
    }
    if (!current.strongsellSignals) {
      current.strongsellSignals = [];
    }
    if (!current.sellSignals) {
      current.sellSignals = [];
    }

    switch (incomingStock.recommendation.toLowerCase()) {
      case 'strongbuy':
        current.strongbuySignals.push(incomingStock.algo);
        current.strongbuySignals = current.strongbuySignals.slice();
        break;
      case 'buy':
        current.buySignals.push(incomingStock.algo);
        current.buySignals = current.buySignals.slice();
        break;
      case 'strongsell':
        current.strongsellSignals.push(incomingStock.algo);
        current.strongsellSignals = current.strongsellSignals.slice();
        break;
      case 'sell':
        current.sellSignals.push(incomingStock.algo);
        current.sellSignals = current.sellSignals.slice();
        break;
    }

    return current;
  }

  sell(row: Stock): void {
    this.order(row, 'Sell');
  }

  buy(row: Stock): void {
    this.order(row, 'Buy');
  }

  order(row: Stock, side: string): void {
    this.portfolioService.getInstruments(row.stock).subscribe((response) => {
      const instruments = response.results[0];
      const newHolding: Holding = {
        instrument: instruments.url,
        symbol: instruments.symbol,
        name: instruments.name,
        realtime_price: row.lastPrice
      };

      const dialogRef = this.dialog.open(OrderDialogComponent, {
        width: '500px',
        height: '500px',
        data: { holding: newHolding, side: side }
      });

      dialogRef.afterClosed().subscribe(result => {
        console.log('Closed dialog', result);
      });
    });
  }

  runDefaultBacktest() {
    this.resetTable();

    this.interval = 0;
    this.getData(this.tickerList, 'daily-indicators');

    this.progress = 0;
  }

  openChartDialog(element: Stock, endDate) {
    const params: ChartParam = {
      algorithm: this.globalSettingsService.selectedAlgo,
      symbol: element.stock,
      date: endDate,
      params: {
        deviation: this.globalSettingsService.deviation,
        fastAvg: this.globalSettingsService.fastAvg,
        slowAvg: this.globalSettingsService.slowAvg
      }
    };

    const dialogRef = this.dialog.open(ChartDialogComponent, {
      width: '250px',
      height: '250px',
      data: { chartData: params }
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('Closed dialog', result);
      if (result.algorithm === 'sma' || result.algorithm === 'macrossover') {
        this.globalSettingsService.deviation = result.params.deviation;
        this.globalSettingsService.fastAvg = result.params.fastAvg;
        this.globalSettingsService.slowAvg = result.params.slowAvg;
      }

      if (result && result.algorithm) {
        this.globalSettingsService.selectedAlgo = result.algorithm;
        this.algo.currentChart.next(result);
      }
    });
  }

  runAi(element: Stock, runWithoutChecks = false) {
    if (runWithoutChecks) {
      this.aiPicksService.tickerBuyRecommendationQueue.next(element.stock);
      this.aiPicksService.tickerSellRecommendationQueue.next(element.stock);
    } else if (element.sellSignals && element.buySignals) {
      if (element.sellSignals.length > element.buySignals.length) {
        this.aiPicksService.tickerSellRecommendationQueue.next(element.stock);
      } else if (element.sellSignals.length < element.buySignals.length) {
        this.aiPicksService.tickerBuyRecommendationQueue.next(element.stock);
      }
    }
  }

  getImpliedMovement(stock: Stock) {
    const symbol = stock.stock;
    const foundStock = this.findStock(symbol, this.stockList);
    this.optionsDataService.getImpliedMove(symbol)
      .subscribe({
        next: data => {
          foundStock.impliedMovement = data.move;
          this.addToList(foundStock);
        }
      });
  }

  executeBacktests() {
    this.bufferSubject = new Subject();

    this.bufferSubject
      .subscribe(() => {
        const backtest = this.backtestBuffer[0];
        this.callChainSub.add(backtest.sub
          .pipe(take(1))
          .subscribe(() => {
            this.backtestBuffer.shift();
            setTimeout(() => {
              this.triggerNextBacktest();
            }, 10000);
          }, error => {
            this.snackBar.open(`Error on ${backtest.stock}`, 'Dismiss');
            console.log(`Error on ${backtest.stock}`, error);
            this.incrementProgress();
            this.backtestBuffer.shift();
            this.triggerNextBacktest();
            this.addToBlackList(backtest.stock);
          }));
      });

    this.triggerNextBacktest();
  }

  triggerNextBacktest() {
    if (this.backtestBuffer.length > 0) {
      this.bufferSubject.next();
    }
  }

  isBlackListed(ticker: string) {
    return this.tickerBlacklist[ticker];
  }

  resetTable() {
    this.currentList = [];
  }

  addToBlackList(ticker: string) {
    this.tickerBlacklist[ticker] = true;
  }

  autoActivate() {
    this.endDate = moment().format('YYYY-MM-DD');
    this.runDefaultBacktest();
  }

  ngOnDestroy() {
    this.callChainSub.unsubscribe();
    this.resetTable();
  }
}
