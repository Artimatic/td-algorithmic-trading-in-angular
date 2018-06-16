import { Component, OnInit, Input, OnChanges, SimpleChanges, Inject } from '@angular/core';
import { DataSource } from '@angular/cdk/collections';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/merge';
import { MatDialog, MatDialogRef, MatTableDataSource } from '@angular/material';
import * as moment from 'moment';

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
  @Input() selectedAlgo: string;

  rhDatabase = new RhDatabase();
  dataSource: RhDataSource | null;
  recommendation = '';

  constructor(
    private algo: BacktestService,
    public dialog: MatDialog,
    private portfolioService: PortfolioService) { }

  ngOnInit() {
    this.dataSource = new RhDataSource(this.rhDatabase);
    this.filterRecommendation();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.data) {
      this.getData(changes.data.currentValue);
    }
  }

  getData(algoParams) {
    algoParams.forEach((param) => {
      this.algo.getInfo(param).subscribe((stockData) => {
        stockData.stock = param.ticker;
        stockData.totalReturns = +((stockData.totalReturns * 100).toFixed(2));
        this.rhDatabase.addStock(stockData);
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
    this.dataSource.filter = `${this.recommendation}`;
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

export class RhDatabase {
  dataChange: BehaviorSubject<Stock[]> = new BehaviorSubject<Stock[]>([]);
  get data(): Stock[] { return this.dataChange.value; }

  constructor() { }

  addStock(stock: Stock) {
    const copiedData = this.data.slice();
    copiedData.push(stock);
    this.dataChange.next(copiedData);
  }
}

export class RhDataSource extends DataSource<any> {
  _filterChange = new BehaviorSubject('');
  get filter(): string { return this._filterChange.value; }
  set filter(filter: string) { this._filterChange.next(filter); }

  constructor(private _rhDatabase: RhDatabase) {
    super();
  }

  connect(): Observable<Stock[]> {
    const displayDataChanges = [
      this._rhDatabase.dataChange,
      this._filterChange,
    ];

    return Observable.merge(...displayDataChanges).map(() => {
      return this._rhDatabase.data.slice().filter((item: Stock) => {
        const searchStr = JSON.stringify(item).toLowerCase();
        return searchStr.indexOf(this.filter.toLowerCase()) !== -1;
      });
    });
  }

  disconnect() { }
}
