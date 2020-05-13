import { Injectable } from '@angular/core';
import { GlobalTaskQueueService } from './global-task-queue.service';
import { PortfolioService } from './portfolio.service';
import { CartService } from './cart.service';
import * as _ from 'lodash';
import * as moment from 'moment-timezone';

import { take } from 'rxjs/operators';
import { SmartOrder } from '@shared/models/smart-order';
import { DaytradeService } from './daytrade.service';
import { MatSnackBar } from '@angular/material';

@Injectable({
  providedIn: 'root'
})
export class OrderingService {
  constructor(private globalTaskQueueService: GlobalTaskQueueService,
    private portfolioService: PortfolioService,
    private cartService: CartService,
    private snackBar: MatSnackBar,
    private daytradeService: DaytradeService) { }

  executeMlOrder(symbol: string, quantity: number) {
    const cb = (result) => {
      console.log('result: ', result);
      this.portfolioService.getPrice(symbol)
        .pipe(take(1))
        .subscribe((stockPrice) => {
          this.portfolioService.getTdBalance()
            .pipe(take(1))
            .subscribe(balance => {
              const totalBalance = _.add(balance.cashBalance, balance.moneyMarketFund);
              let totalBuyAmount = quantity * stockPrice;

              if (totalBuyAmount > totalBalance) {
                totalBuyAmount = totalBalance;
              }

              const order = this.cartService.buildOrder(symbol, quantity, stockPrice);

              if (result.nextOutput > 0.5) {
                this.initiateBuy(order);
              } else if (result.nextOutput < 0.5) {
                this.sellAll(order);
              }
            });
        });

    };

    this.globalTaskQueueService.activateMl2(symbol, undefined, cb, () => { });
  }

  sellAll(order: SmartOrder) {
    const resolve = () => {
      this.snackBar.open(`Sell all ${order.holding.symbol} order sent`, 'Dismiss');
    };

    const reject = (error) => {
      this.snackBar.open(`Error selling ${order.holding.symbol}`, 'Dismiss');
    };

    const notFound = (error) => {
      this.snackBar.open(`${order.holding.symbol} position not found`, 'Dismiss');
    };
    this.daytradeService.closePosition(order, 'limit', resolve, reject, notFound);
  }

  initiateBuy(order: SmartOrder) {
    const buyOrder = this.daytradeService.createOrder(order.holding, 'Buy', order.quantity, order.price, moment().unix());

    const resolve = () => {
      this.snackBar.open(`Buy ${order.holding.symbol} order sent`, 'Dismiss');
    };

    const reject = (error) => {
      this.snackBar.open(`Error sending buy ${order.holding.symbol} order`, 'Dismiss');
    };

    this.portfolioService.extendedHoursBuy(buyOrder.holding, buyOrder.quantity, buyOrder.price).subscribe(
      response => {
        resolve();
      },
      error => {
        reject(error);
      });
  }
}
