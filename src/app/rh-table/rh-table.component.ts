import { Component, OnInit, Input, OnChanges, SimpleChanges, Inject } from '@angular/core';
import { DataSource } from '@angular/cdk/collections';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/merge';
import 'rxjs/add/operator/finally';
import { MatSnackBar, MatDialog, MatDialogRef } from '@angular/material';
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
  stocks: Stock[] = [];
  currentList: Stock[] = [];
  endDate;
  progress = 0;
  algos = [
    {value: 'v1', viewValue: 'Mean Reversion - Moving Average Crossover'},
    {value: 'v2', viewValue: 'Mean Reversion - Bollinger Band'}
  ];

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
    const startDate = moment(this.endDate).subtract(350, 'days').format('YYYY-MM-DD');

    // algoParams.forEach((param) => {
    //   this.algo.getInfo(param)
    //   .subscribe((stockData: Stock) => {
    //     stockData.stock = param.ticker;
    //     stockData.totalReturns = +((stockData.totalReturns * 100).toFixed(2));
    //     this.stocks.push(stockData);
    //   });
    // });
    this.progress = 5;
    const increment = +((1 / algoParams.length).toFixed(2)) * 100;

    algoParams.forEach((param) => {
      this.algo.getInfoV2(param.ticker, currentDate, startDate).subscribe(
        result => {
          result.stock = param.ticker;
          this.addToList(result);
          this.progress += increment;
        }, error => {
          console.log('error: ', error);
          this.snackBar.open(`Error on ${param.ticker}`, 'Dismiss');
          this.progress += increment;
        });
    });
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
    if (!this.recommendation) {
      this.currentList = this.stocks;
    } else {
      this.currentList = _.filter(this.stocks, (stock) => {
        return stock.recommendation.toLowerCase() === this.recommendation;
      });
    }
  }

  addToList(stock: Stock) {
    this.stocks.push(stock);
    if (!this.recommendation || stock.recommendation.toLowerCase() === this.recommendation ) {
      this.currentList.push(stock);
    }
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
