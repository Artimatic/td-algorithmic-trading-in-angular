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
      const params = {
        ticker: row.Stock,
        start: row.Start || moment().subtract(1, 'years').format('YYYY-MM-DD'),
        end: row.End || moment().format('YYYY-MM-DD'),
        short: row.Short || 30,
        long:	row.Long || 90,
        deviation: row.Deviation
      };

      this.stocks.push(params);
    });
  }

  query(param) {
    console.log('stock: ', param);
    this.stocks = [];
    const params = {
      ticker: param.query,
      start: moment().subtract(1, 'years').format('YYYY-MM-DD'),
      end: moment().format('YYYY-MM-DD'),
      short: param.short || 30,
      long:	param.long || 90,
      deviation: param.deviation
    };
    this.stocks.push(params);
  }
}
