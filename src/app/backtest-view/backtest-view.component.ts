import { Component, OnInit } from '@angular/core';
import { CartService } from '../shared/services/cart.service';
import { SmartOrder } from '../shared/models/smart-order';
import { ScoreKeeperService, BacktestService, PortfolioService } from '../shared';
import { Holding } from '../shared/models';

import * as _ from 'lodash';
import { OrderRow } from '../shared/models/order-row';
import { MatSnackBar } from '@angular/material';

@Component({
  selector: 'app-backtest-view',
  templateUrl: './backtest-view.component.html',
  styleUrls: ['./backtest-view.component.css']
})
export class BacktestViewComponent implements OnInit {

  backtestData: any;

  constructor(
    private portfolioService: PortfolioService,
    public cartService: CartService,
    public scoreKeeperService: ScoreKeeperService,
    private backtestService: BacktestService,
    public snackBar: MatSnackBar
    ) { }

  ngOnInit() {
    this.backtestData = {};
  }

  import(file) {
    file.forEach((row: OrderRow) => {
      this.portfolioService.getInstruments(row.symbol).subscribe((response) => {
        const instruments = response.results[0];
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
          profitTarget: row.Target * 1 || null,
          useStopLoss: row.StopLoss || null,
          useTakeProfit: row.TakeProfit || null,
          meanReversion1: row.MeanReversion1 || null,
          useMfi: row.Mfi || null,
          spyMomentum: row.SpyMomentum || null,
          orderSize: row.OrderSize * 1 || null
        };
        this.cartService.addToCart(order);
      },
      (error) => {
        this.snackBar.open('Error getting instruments', 'Dismiss', {
          duration: 2000,
        });
      });
    });
  }

  confirmBacktest(): void {
    this.triggerBacktest(this.cartService.sellOrders);
    this.triggerBacktest(this.cartService.buyOrders);
    this.triggerBacktest(this.cartService.otherOrders);
  }

  triggerBacktest(orders: SmartOrder[]) {
    _.forEach(orders, (order: SmartOrder) => {
      this.requestQuotes(order.holding.symbol)
        .then((data: any) => {
          this.backtestData[order.holding.symbol] = data;
          order.triggeredBacktest = true;
        });
    });
  }

  requestQuotes(symbol: string) {
    return this.backtestService.getYahooIntraday(symbol).toPromise()
      .then((result) => {
        return result;
      });
  }
}
