import { Component, OnInit } from '@angular/core';
import { CartService } from '../shared/services/cart.service';
import { SmartOrder } from '../shared/models/smart-order';
import { ScoreKeeperService, BacktestService } from '../shared';

import * as _ from 'lodash';
import { MatSnackBar } from '@angular/material';
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

  constructor(
    public cartService: CartService,
    public scoreKeeperService: ScoreKeeperService,
    private backtestService: BacktestService,
    public snackBar: MatSnackBar,
    private todoService: TodoService,
    public globalSettingsService: GlobalSettingsService
  ) { }

  ngOnInit() {
    this.todoService.setIntradayBacktest();
    this.backtestsCtr = 0;
  }

  async import(file, trigger = false) {
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
          buyCloseSellOpen: row.BuyCloseSellOpen || null,
          yahooData: row.YahooData || null,
          sellAtClose: row.SellAtClose || null,
          orderSize: row.OrderSize * 1 || null,
        };
        this.cartService.addToCart(order);

        if (trigger) {
          setTimeout(() => {
            this.backtestService.triggerBacktest.next(order.holding.symbol);
          }, 500);
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
}
