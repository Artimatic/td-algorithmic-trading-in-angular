import { Component, OnInit, Input } from '@angular/core';
import { DataSource } from '@angular/cdk/collections';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';

import { BacktestService, Stock, AlgoParam, Row } from '../shared';
import * as moment from 'moment';

@Component({
  selector: 'app-bulk-backtest',
  templateUrl: './bulk-backtest.component.html',
  styleUrls: ['./bulk-backtest.component.css']
})
export class BulkBacktestComponent implements OnInit {
  private stocks: AlgoParam[] = [];
  headers: Array<string>;

  constructor(private algo: BacktestService) {}

  ngOnInit() {
    this.headers = ['stock', 'totalReturns', 'lastVolume', 'lastPrice', 'totalTrades', 'trending'];

  }

  runAlgo() {
  }

  import(event) {
    this.stocks = [];
    event.forEach((row: Row) => {
      let params = {
        ticker: row.Stock,
        start: row.Start,
        end: row.End
      };

      if(!row.Start) {
        params.start = moment().subtract(1, 'years').format('YYYY-MM-DD');
      }

      if(!row.End) {
        params.end = moment().format('YYYY-MM-DD');
      }

      this.stocks.push(params);
    });
  }

  query(stock) {
    console.log('stock: ', stock);
    this.stocks = [];
    let params = {
      ticker: stock,
      start: moment().subtract(1, 'years').format('YYYY-MM-DD'),
      end: moment().format('YYYY-MM-DD')
    };
    this.stocks.push(params);
  }
}
