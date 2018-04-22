import { Injectable } from '@angular/core';
import { BacktestService } from './backtest.service';
import { AuthenticationService } from './authentication.service';
import { PortfolioService } from './portfolio.service';
import { OrderPref } from '../enums/order-pref.enum';
import { SmartOrder } from '../models/smart-order';

import * as moment from 'moment';

@Injectable()
export class DaytradeService {

  constructor(private backtestService: BacktestService,
    private authenticationService: AuthenticationService,
    private portfolioService: PortfolioService) { }

  getDefaultOrderSize(quantity) {
    return Math.ceil(quantity / 3);
  }

  async getBBand(real: any[]): Promise<any[]> {
    const body = {
      real: real,
      period: 80,
      stddev: 2
    };

    return await this.backtestService.getBBands(body).toPromise();
  }

  parsePreferences(preferences) {
    const config = { TakeProfit: false, StopLoss: false };
    if (preferences) {
      preferences.forEach((value) => {
        switch (value) {
          case OrderPref.TakeProfit:
            config.TakeProfit = true;
            break;
          case OrderPref.StopLoss:
            config.StopLoss = true;
            break;
        }
      });
    }
    return config;
  }

  getOrderQuantity(maxAllowedOrders: number, orderSize: number, ordersAlreadyMade: number): number {
    if (ordersAlreadyMade >= maxAllowedOrders) {
      return 0;
    }
    if (orderSize + ordersAlreadyMade > maxAllowedOrders) {
      console.log('maxAllowedOrders: ', maxAllowedOrders, ordersAlreadyMade);

      return maxAllowedOrders - ordersAlreadyMade;
    }

    return orderSize;
  }

  sendBuy(buyOrder: SmartOrder, resolve, reject) {
    this.authenticationService.getPortfolioAccount().subscribe(account => {
      this.portfolioService.buy(buyOrder.holding, buyOrder.quantity, buyOrder.price).subscribe(
        response => {
          resolve(response);
        },
        error => {
          reject(error);
        });
    });
    return buyOrder;
  }

  sendSell(sellOrder: SmartOrder, resolve: Function, reject: Function, handleNotFound: Function): SmartOrder {
    this.authenticationService.getPortfolioAccount().subscribe(account => {
      this.portfolioService.getPortfolio()
        .subscribe(result => {
          const foundPosition = result.find((pos) => {
            return pos.instrument === sellOrder.holding.instrument;
          });

          if (foundPosition) {
            const positionCount = Number(foundPosition.quantity);
            sellOrder.quantity = sellOrder.quantity < positionCount ? sellOrder.quantity : positionCount;
            this.portfolioService.sell(sellOrder.holding, sellOrder.quantity, sellOrder.price).subscribe(
              response => {
                resolve(response);
              },
              error => {
                reject(error);
              });
          } else {
            handleNotFound();
          }
        });
    },
      error => {
        reject();
      });
    return sellOrder;
  }

  buildTileList(orders: SmartOrder[]): any[] {
    let currentList: any[] = [];
    const tiles = [];

    for (let i = 0, len = orders.length; i < len; ++i) {
      let action = orders[i].side.toLowerCase();
      if (action === 'buy') {
        action = 'Bought';
      } else if (action === 'sell') {
        action = 'Sold';
      }
      const orderRow = {
        timeSubmitted: moment.unix(orders[i].timeSubmitted).format('hh:mm'),
        signalTime: moment(orders[i].signalTime).format('hh:mm'),
        quantity: orders[i].quantity,
        price: orders[i].price,
        action
      };

      currentList.push(orderRow);
      if (currentList.length >= 5) {
        tiles.push({ orders: currentList, cols: 1, rows: 1 });
        currentList = [];
      }
    }

    tiles.push({ orders: currentList, cols: 1, rows: 1 });


    return tiles;
  }

  createOrder(holding, side, quantity, price, signalTime): SmartOrder {
    return {
      holding: holding,
      quantity: quantity,
      price: Number(price.toFixed(2)),
      submitted: false,
      pending: false,
      side: side,
      timeSubmitted: moment().unix(),
      signalTime: moment.unix(signalTime).valueOf()
    };
  }
}
