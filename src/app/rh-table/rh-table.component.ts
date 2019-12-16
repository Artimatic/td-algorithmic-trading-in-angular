import { Component, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
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
export interface Algo {
  value: string;
  viewValue: string;
}

export interface AlgoGroup {
  disabled?: boolean;
  name: string;
  algorithm: Algo[];
}

@Component({
  selector: 'app-rh-table',
  templateUrl: './rh-table.component.html',
  styleUrls: ['./rh-table.component.scss']
})
export class RhTableComponent implements OnInit, OnChanges {
  @Input() data: AlgoParam[];
  @Input() displayedColumns: string[];

  selectedRecommendation: string[];
  stockList: Stock[] = [];
  currentList: Stock[] = [];
  algoReport = {
    totalReturns: 0,
    totalTrades: 0,
    averageReturns: 0,
    averageTrades: 0
  };

  endDate: string;
  progressPct = 0;
  progress = 0;
  totalStocks = 0;
  selectedAlgo = 'v2';
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
        { value: 'v2', viewValue: 'Daily - Bollinger Band' },
        { value: 'v5', viewValue: 'Daily - Money Flow Index' },
        { value: 'v1', viewValue: 'Daily - Moving Average Crossover' },
        { value: 'moving_average_resistance', viewValue: 'Daily - Moving Average Resistance' },
        { value: 'v3', viewValue: 'Intraday - MFI' },
        { value: 'v4', viewValue: 'Intraday - Bollinger Band' },
      ]
    }
  ];
  recommendations: any[];
  cols: any[];
  selectedColumns: any[];
  selectedStock: any;
  twoOrMoreSignalsOnly: boolean;

  constructor(
    public snackBar: MatSnackBar,
    private algo: BacktestService,
    public dialog: MatDialog,
    private portfolioService: PortfolioService,
    private globalSettingsService: GlobalSettingsService) { }

  ngOnInit() {
    this.recommendations = [
      { value: 'strongbuy', label: 'Strong Buy' },
      { value: 'buy', label: 'Buy' },
      { value: 'sell', label: 'Sell' },
      { value: 'strongsell', label: 'Strong Sell' }
    ];
    this.endDate = moment(this.endDate).format('YYYY-MM-DD');
    this.cols = [
      { field: 'stock', header: 'Stock' },
      { field: 'returns', header: 'Returns' },
      { field: 'lastVolume', header: 'Last Volume' },
      { field: 'lastPrice', header: 'Last Price' },
      { field: 'totalTrades', header: 'Trades' },
      { field: 'strongbuySignals', header: 'Strong Buy' },
      { field: 'buySignals', header: 'Buy' },
      { field: 'sellSignals', header: 'Sell' },
      { field: 'strongsellSignals', header: 'Strong Sell' }];

    this.selectedColumns = [
      { field: 'stock', header: 'Stock' },
      { field: 'returns', header: 'Returns' },
      { field: 'totalTrades', header: 'Trades' },
      { field: 'strongbuySignals', header: 'Strong Buy' },
      { field: 'buySignals', header: 'Buy' },
      { field: 'sellSignals', header: 'Sell' },
      { field: 'strongsellSignals', header: 'Strong Sell' }
    ];

    this.selectedRecommendation = ['strongbuy', 'buy', 'sell', 'strongsell'];
    this.filter();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.data) {
      this.getData(changes.data.currentValue);
    }
  }

  async getData(algoParams) {
    const currentDate = moment(this.endDate).format('YYYY-MM-DD');
    const startDate = moment(this.endDate).subtract(700, 'days').format('YYYY-MM-DD');

    this.progress = 0;
    this.totalStocks += algoParams.length;
    this.algoReport = {
      totalReturns: 0,
      totalTrades: 0,
      averageReturns: 0,
      averageTrades: 0
    };

    let algo;

    switch (this.selectedAlgo) {
      case 'v1':
        algoParams.forEach((param) => {
          if (!param.start) {
            param.start = startDate;
          }
          if (!param.end) {
            param.end = currentDate;
          }
          this.algo.getInfo(param)
            .subscribe((stockData: Stock) => {
              stockData.stock = param.ticker;
              stockData.recommendation = stockData.trending;
              stockData.returns = stockData.totalReturns;
              this.addToList(stockData);
              this.incrementProgress();
              this.updateAlgoReport(stockData);
            }, error => {
              console.log('error: ', error);
              this.snackBar.open(`Error on ${param.ticker}`, 'Dismiss');
              this.incrementProgress();
            });
        });
        break;
      case 'v2':
        for (const param of algoParams) {
          await this.algo.getInfoV2(param.ticker, currentDate, startDate).subscribe(
            result => {
              result.stock = param.ticker;
              this.addToList(result);
              this.incrementProgress();
              this.updateAlgoReport(result);
            }, error => {
              this.snackBar.open(`Error on ${param.ticker}`, 'Dismiss');
              console.log(`Error on ${param.ticker}`, error);
              this.incrementProgress();
            });
        }
        break;
      case 'v3':
        algo = 'intraday';
        algoParams.forEach((param) => {
          this.algo.getBacktestEvaluation(param.ticker, startDate, currentDate, algo).subscribe(
            result => {
              this.incrementProgress();
            }, error => {
              this.snackBar.open(`Error on ${param.ticker}`, 'Dismiss');
              this.incrementProgress();
            });
        });
        break;
      case 'v4':
        algo = 'bbands';
        algoParams.forEach((param) => {
          this.algo.getBacktestEvaluation(param.ticker, startDate, currentDate, 'crossover').subscribe(
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
                  status => {
                  }, error => {
                    this.snackBar.open(`Error on ${param.ticker}`, 'Dismiss');
                    this.incrementProgress();
                  });
              }, error => {
                this.snackBar.open(`Error on ${param.ticker}`, 'Dismiss');
                this.incrementProgress();
              });
        });
        break;
      case 'v5':
        algo = 'daily-mfi';
        algoParams.forEach((param) => {
          this.algo.getBacktestEvaluation(param.ticker, startDate, currentDate, algo).subscribe(
            (testResults: any[]) => {
              if (testResults.length > 0) {
                const result = testResults[testResults.length - 1];
                result.stock = param.ticker;
                this.addToList(result);
                this.updateAlgoReport(result);
              }
              this.incrementProgress();
            }, error => {
              this.snackBar.open(`Error on ${param.ticker}`, 'Dismiss');
              this.incrementProgress();
              console.log(`Error on ${param.ticker} ${algo}`, error);
            });
        });
        break;
      case 'moving_average_resistance':
        algoParams.forEach((param) => {
          this.algo.getResistanceChart(param.ticker, startDate, currentDate).subscribe(
            (result: any) => {
              result.stock = param.ticker;
              this.addToList(result);
              this.updateAlgoReport(result);
              this.incrementProgress();
            }, error => {
              this.snackBar.open(`Error on ${param.ticker}`, 'Dismiss');
              this.incrementProgress();
              console.log(`Error on ${param.ticker} ${algo}`, error);
            });
        });
        break;
    }
  }

  incrementProgress() {
    this.progress++;
    this.progressPct = this.convertToPercent(this.progress, this.totalStocks);
  }

  convertToPercent(firstVal, secondVal) {
    return +(Math.round(firstVal / secondVal).toFixed(2)) * 100;
  }

  updateAlgoReport(result: Stock) {
    this.algoReport.totalReturns += result.returns;
    this.algoReport.totalTrades += result.totalTrades;
    this.algoReport.averageReturns = +((this.algoReport.totalReturns / this.totalStocks).toFixed(5));
    this.algoReport.averageTrades = +((this.algoReport.totalTrades / this.totalStocks).toFixed(5));
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

  addToList(stock: Stock) {
    this.stockList = this.findAndUpdate(stock, this.stockList);
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
    const currentSelected = this.selectedAlgo;

    this.selectedAlgo = 'v2';
    this.getData(Stocks);

    this.selectedAlgo = 'v5';
    this.getData(Stocks);

    this.selectedAlgo = 'moving_average_resistance';
    this.getData(Stocks);

    this.progress = 0;
    this.selectedAlgo = currentSelected;
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
      width: '500px',
      height: '500px',
      data: { chartData: params }
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('Closed dialog', result);
      if (result.algorithm === 'sma' || result.algorithm === 'macrossover') {
        this.globalSettingsService.deviation = result.params.deviation;
        this.globalSettingsService.fastAvg = result.params.fastAvg;
        this.globalSettingsService.slowAvg = result.params.slowAvg;
      }
      this.globalSettingsService.selectedAlgo = result.algorithm;

      this.algo.currentChart.next(result);
    });
  }
}
