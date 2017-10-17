import { Component, OnInit, Input } from '@angular/core';
import { DataSource } from '@angular/cdk/collections';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';

import { BacktestService, Stock } from '../shared';

@Component({
  selector: 'app-bulk-backtest',
  templateUrl: './bulk-backtest.component.html',
  styleUrls: ['./bulk-backtest.component.css']
})
export class BulkBacktestComponent implements OnInit {
  @Input() stocks: Stock[];
  headers: Array<string>;

  constructor(private algo: BacktestService) { }

  ngOnInit() {
    this.headers = ['stock', 'totalReturns', 'lastVolume', 'lastPrice', 'totalTrades', 'trending'];
    this.stocks = [
      { stock: 'test', totalReturns: 2, lastVolume: 1, lastPrice: 1.00, totalTrades: 1, trending: 'Buy' }
    ];
  }

  import(event) {
    console.log('event: ', event);
    event.forEach(({Stock}) => {
      let data = {ticker: Stock};
      this.algo.postMeanReversion(data).subscribe((stock) => {
        console.log('kennen000: ', stock, data.ticker);
        stock.stock = data.ticker;
        this.stocks.push(stock);
      });
    });
  }
}
