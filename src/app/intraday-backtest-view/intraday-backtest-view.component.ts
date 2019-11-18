import { Component, OnInit } from '@angular/core';
import { CartService } from '../shared/services/cart.service';
import { SmartOrder } from '../shared/models/smart-order';
import { ScoreKeeperService, BacktestService, PortfolioService } from '../shared';
import { Holding } from '../shared/models';

import * as _ from 'lodash';
import { MatSnackBar } from '@angular/material';
import { TodoService } from '../overview/todo-list/todo.service';
import IntradayStocks from './intraday-backtest-stocks.constant';
import { OrderRow } from '../shared/models/order-row';
import { GlobalSettingsService } from '../settings/global-settings.service';

@Component({
  selector: 'app-intraday-backtest-view',
  templateUrl: './intraday-backtest-view.component.html',
  styleUrls: ['./intraday-backtest-view.component.css']
})
export class IntradayBacktestViewComponent implements OnInit {

  backtestData: any;
  progressPct = 0;
  progress = 0;

  constructor(
    private portfolioService: PortfolioService,
    public cartService: CartService,
    public scoreKeeperService: ScoreKeeperService,
    private backtestService: BacktestService,
    public snackBar: MatSnackBar,
    private todoService: TodoService,
    private globalSettingsService: GlobalSettingsService
  ) { }

  ngOnInit() {
    this.backtestData = {};
    this.todoService.setIntradayBacktest();
  }

  getInstrument(symbol: string) {
    return this.portfolioService.getInstruments(symbol).toPromise();
  }

  async import(file) {
    let row: OrderRow;
    for (row of file) {
      try {
        const instrument = await this.getInstrument(row.symbol);

        setTimeout(() => {
          const instruments = instrument.results[0];
          const newHolding: Holding = {
            instrument: instruments.url,
            symbol: instruments.symbol,
            name: instruments.name
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
            meanReversion1: row.MeanReversion1 || null,
            useMfi: row.Mfi || null,
            spyMomentum: row.SpyMomentum || null,
            buyCloseSellOpen: row.BuyCloseSellOpen || null,
            yahooData: row.YahooData || null,
            sellAtClose: row.SellAtClose || null,
            orderSize: row.OrderSize * 1 || null,
          };
          this.cartService.addToCart(order);
          this.progress++;
          this.progressPct = _.ceil((this.progress / file.length) * 100);
        }, 1000);
      } catch (err) {
        this.snackBar.open('Error getting instruments', 'Dismiss', {
          duration: 2000,
        });
      }
    }
  }

  confirmBacktest(): void {
    this.triggerBacktest(this.cartService.sellOrders);
    this.triggerBacktest(this.cartService.buyOrders);
    this.triggerBacktest(this.cartService.otherOrders);
  }

  triggerBacktest(orders: SmartOrder[]) {
    this.globalSettingsService.backtesting = true;
    _.forEach(orders, (order: SmartOrder, index: number) => {
      setTimeout(() => {
        this.requestQuotes(order.holding.symbol)
          .then((data: any) => {
            this.backtestData[order.holding.symbol] = data;
            order.triggeredBacktest = true;
          });
        console.log('request quote ', order.holding.symbol, new Date().getMinutes(), ':', new Date().getSeconds());
      }, index * 180000);
    });
  }

  requestQuotes(symbol: string) {
    return this.backtestService.getTdIntraday(symbol).toPromise()
      .then((result) => {
        return result;
      });
  }

  loadDefaults() {
    this.import(IntradayStocks);
  }
}
