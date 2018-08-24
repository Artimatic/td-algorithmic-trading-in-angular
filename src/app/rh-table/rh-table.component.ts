import { Component, OnInit, Input, OnChanges, SimpleChanges, Inject } from '@angular/core';
import { DataSource } from '@angular/cdk/collections';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/merge';
import 'rxjs/add/operator/finally';
import { MatSnackBar, MatDialog, MatGridListModule } from '@angular/material';
import * as moment from 'moment';
import * as _ from 'lodash';

import { BacktestService, Stock, AlgoParam, PortfolioService } from '../shared';
import { ChartDialogComponent } from '../chart-dialog';
import { OrderDialogComponent } from '../order-dialog/order-dialog.component';
import { Holding } from '../shared/models';

@Component({
  selector: 'app-rh-table',
  templateUrl: './rh-table.component.html',
  styleUrls: ['./rh-table.component.css']
})
export class RhTableComponent implements OnInit, OnChanges {
  @Input() data: AlgoParam[];
  @Input() displayedColumns: string[];

  recommendation = 'strongbuy';
  stockList: Stock[] = [];
  currentList: Stock[] = [];
  algoReport = {
    totalReturns: 0,
    totalTrades: 0,
    averageReturns: 0,
    averageTrades: 0
  };

  endDate;
  progressPct = 0;
  progress = 0;
  totalStocks = 0;
  algos = [
    { value: 'v1', viewValue: 'Mean Reversion - Moving Average Crossover' },
    { value: 'v2', viewValue: 'Mean Reversion - Bollinger Band' }
  ];
  selectedAlgo = 'v2';

  constructor(
    public snackBar: MatSnackBar,
    private algo: BacktestService,
    public dialog: MatDialog,
    private portfolioService: PortfolioService) { }

  ngOnInit() {
    this.filterRecommendation();
    this.endDate = new Date();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.data) {
      this.getData(changes.data.currentValue);
    }
  }

  getData(algoParams) {
    const currentDate = moment(this.endDate).format('YYYY-MM-DD');
    const startDate = moment(this.endDate).subtract(700, 'days').format('YYYY-MM-DD');

    this.progress = 0;
    this.totalStocks = algoParams.length;
    this.algoReport = {
      totalReturns: 0,
      totalTrades: 0,
      averageReturns: 0,
      averageTrades: 0
    };
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
              stockData.returns = +((stockData.totalReturns * 100).toFixed(2));
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
        algoParams.forEach((param) => {
          this.algo.getInfoV2(param.ticker, currentDate, startDate).subscribe(
            result => {
              result.stock = param.ticker;
              result.returns = +((result.returns * 100).toFixed(2));
              this.addToList(result);
              this.incrementProgress();
              this.updateAlgoReport(result);
            }, error => {
              this.snackBar.open(`Error on ${param.ticker}`, 'Dismiss');
              this.incrementProgress();
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

  openDialog(event, index): void {
    console.log(event, index);
    const currentDate = moment().format('YYYY-MM-DD');
    const pastDate = moment().subtract(1, 'years').format('YYYY-MM-DD');
    const requestBody = {
      ticker: event.stock,
      start: pastDate,
      end: currentDate,
      deviation: event.deviation,
      short: event.shortTerm,
      long: event.longTerm
    };

    const dialogRef = this.dialog.open(ChartDialogComponent, {
      width: '200%',
      height: '100%',
      data: requestBody
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
    });
  }

  filterRecommendation() {
    if (this.recommendation === '') {
      this.currentList = _.clone(this.stockList);
    } else {
      this.currentList = _.filter(this.stockList, (stock) => {
        return stock.recommendation.toLowerCase() === this.recommendation;
      });
    }
  }

  addToList(stock: Stock) {
    stock = this.findAndUpdate(stock, this.stockList);
    if (this.recommendation === '' || stock.recommendation.toLowerCase() === this.recommendation) {
      this.findAndUpdate(stock, this.currentList);
    }
  }

  findAndUpdate(stock: Stock, list: any[]): Stock {
    const idx = _.findIndex(list, (s) => s.stock === stock.stock);
    let updateStock;
    if (idx > -1) {
      updateStock = this.updateRecommendationCount(list[idx], stock);
      list[idx] = updateStock;
    } else {
      updateStock = this.updateRecommendationCount(null, stock);
      list.push(updateStock);
    }
    return updateStock;
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
        break;
      case 'buy':
        current.buySignals.push(incomingStock.algo);
        break;
      case 'strongsell':
        current.strongsellSignals.push(incomingStock.algo);
        break;
      case 'sell':
        current.sellSignals.push(incomingStock.algo);
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
}
