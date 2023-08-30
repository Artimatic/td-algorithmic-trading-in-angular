import { Component, OnInit } from '@angular/core';
import { CartService } from '../shared/services/cart.service';
import { SmartOrder } from '../shared/models/smart-order';
import { ScoreKeeperService, BacktestService, PortfolioService } from '../shared';

import * as moment from 'moment-timezone';
import * as _ from 'lodash';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TodoService } from '../overview/todo-list/todo.service';
import IntradayStocks from './intraday-backtest-stocks.constant';
import { GlobalSettingsService } from '../settings/global-settings.service';
import { Holding } from '../shared/models';

@Component({
  selector: 'app-intraday-backtest-view',
  templateUrl: './intraday-backtest-view.component.html',
  styleUrls: ['./intraday-backtest-view.component.css']
})
export class IntradayBacktestViewComponent implements OnInit {

  progressPct = 0;
  progress = 0;
  backtestsCtr: number;
  cols: any[];
  stocks: any[];

  constructor(
    public cartService: CartService,
    public scoreKeeperService: ScoreKeeperService,
    private backtestService: BacktestService,
    public snackBar: MatSnackBar,
    private todoService: TodoService,
    public globalSettingsService: GlobalSettingsService,
    private portfolioService: PortfolioService
  ) { }

  ngOnInit() {
    this.todoService.setIntradayBacktest();
    this.backtestsCtr = 0;
    this.cols = [
      { field: 'symbol', header: 'symbol' },
      { field: 'price', header: 'price' },
      { field: 'result', header: 'result' }
    ];
    this.stocks = [];
  }

  addResult(symbol, price) {
    const result = {
      symbol,
      price,
      result: this.scoreKeeperService.percentReturns[symbol]
    };
    this.stocks.push(result);
  }

  sort() {
    this.stocks.forEach((stock, idx) => {
      this.stocks[idx].result = this.scoreKeeperService.profitLossHash[stock.symbol];
    });

    this.stocks = this.stocks.sort((a, b) => {
      return b.result - a.result;
    });
  }

  async import(file, trigger = false) {
    let counter = 0;
    for (const row of file) {
      setTimeout(() => {
        const newHolding: Holding = {
          instrument: null,
          symbol: row.symbol,
          name: null
        };

        const order: SmartOrder = {
          holding: newHolding,
          quantity: row.quantity * 1,
          price: row.price,
          submitted: false,
          pending: false,
          side: row.side,
          lossThreshold: row.Stop * 1 || null,
          trailingStop: row.TrailingStop || null,
          profitTarget: row.Target * 1 || null,
          useStopLoss: row.StopLoss || null,
          useTrailingStopLoss: row.TrailingStopLoss || null,
          useTakeProfit: row.TakeProfit || null,
          sellAtClose: row.SellAtClose || null,
          orderSize: row.OrderSize * 1 || null,
        };
        this.cartService.addToCart(order);

        if (trigger) {
          setTimeout(() => {
            this.backtestService.triggerBacktest.next(order.holding.symbol);
            this.portfolioService.getPrice(order.holding.symbol)
              .subscribe((quote) => {
                this.addResult(order.holding.symbol, quote);
              });
          }, 10000 * counter++);
        }

        this.progress++;
        this.progressPct = _.ceil((this.progress / file.length) * 100);
      }, 100);
    }
  }

  confirmBacktest(): void {
    this.triggerBacktest(this.cartService.sellOrders);
    this.triggerBacktest(this.cartService.buyOrders);
    this.triggerBacktest(this.cartService.otherOrders);
  }

  async triggerBacktest(orders: SmartOrder[]) {
    this.globalSettingsService.backtesting = true;
    for (const order of orders) {
      this.backtestService.triggerBacktest.next(order.holding.symbol);
    }
    this.globalSettingsService.backtesting = false;
  }

  requestQuotes(symbol: string) {
    return this.backtestService.getTdIntraday(symbol).toPromise()
      .then((result) => {
        return result;
      });
  }

  loadDefaults() {
    this.import(IntradayStocks, true);
  }

  loadRandoms() {
    const stocks = this.importRandom();
    console.log('Loading ', stocks);
    this.import(stocks, true);
  }

  importRandom() {
    const stockList = [];
    const uniqueCheck = {};
    for (let i = 0; i < 25; i++) {
      let rand;
      do {
        rand = Math.floor(Math.random() * IntradayStocks.length);
      } while (uniqueCheck[rand]);
      stockList.push(IntradayStocks[rand]);
      uniqueCheck[rand] = true;
    }
    return stockList;
  }

  calibrate() {
    const stocks = ['MSFT', 'AAPL', 'FB', 'CRM', 'D'];
    const startDate = this.globalSettingsService.backtestDate;
    const futureDate = moment().add(1, 'days').format('YYYY-MM-DD');
    const quotesPromises = [];

    let counter = 0;

    for (const symbol of stocks) {
      quotesPromises.push(this.backtestService.getYahooIntraday(symbol).toPromise()
        .then(quotes => {
          setTimeout(() => {
            this.backtestService.postIntraday(quotes).subscribe();
          }, 10000 * counter++);
        }));
    }

    Promise.all(quotesPromises).then(() => {
      this.backtestService.calibrateDaytrade(stocks, futureDate, startDate)
        .subscribe(result => {
          console.log('results: ', result);
        });
    })
      .catch(() => {
        this.backtestService.calibrateDaytrade(stocks, futureDate, startDate)
          .subscribe(result => {
            console.log('results: ', result);
          });
      });
  }
}
