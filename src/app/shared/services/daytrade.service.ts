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

  async getBBand(reals: number[], period): Promise<any[]> {
    const body = {
      real: this.fillInMissingReals(reals),
      period: period,
      stddev: 2
    };

    return await this.backtestService.getBBands(body).toPromise();
  }

  fillInMissingReals(reals: number[]) {
    for (let i = 1, length = reals.length; i < length; i++) {
      if (!reals[i]) {
        if (reals[i - 1] && reals[i + 1]) {
          reals[i] = (reals[i - 1] + reals[i + 1]) / 2;
        }
      }
    }
    return reals;
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
      return maxAllowedOrders - ordersAlreadyMade;
    }

    return orderSize;
  }

  sendBuy(buyOrder: SmartOrder, resolve, reject) {
    this.authenticationService.getPortfolioAccount().subscribe(account => {
      this.portfolioService.buy(buyOrder.holding, buyOrder.quantity, buyOrder.price, 'limit').subscribe(
        response => {
          resolve(response);
        },
        error => {
          reject(error);
        });
    });
    return buyOrder;
  }

  sendSell(sellOrder: SmartOrder, type: string, resolve: Function, reject: Function, handleNotFound: Function): SmartOrder {
    this.authenticationService.getPortfolioAccount().subscribe(account => {
      this.portfolioService.getPortfolio()
        .subscribe(result => {
          const foundPosition = result.find((pos) => {
            return pos.instrument === sellOrder.holding.instrument;
          });

          if (foundPosition) {
            const positionCount = Number(foundPosition.quantity);
            if (positionCount === 0) {
              handleNotFound();
            } else {
              sellOrder.quantity = sellOrder.quantity < positionCount ? sellOrder.quantity : positionCount;
              this.portfolioService.sell(sellOrder.holding, sellOrder.quantity, sellOrder.price, type).subscribe(
                response => {
                  resolve(response);
                },
                error => {
                  reject(error);
                });
            }
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

  createOrder(holding, side: string, quantity: number, price: number, signalTime: number): SmartOrder {
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

  getPercentChange(currentPrice: number, boughtPrice: number) {
    if (boughtPrice === 0 || currentPrice === boughtPrice) {
      return 0;
    } else {
      return (currentPrice - boughtPrice) / boughtPrice;
    }
  }

  estimateAverageBuyOrderPrice(positionCount: number, orders: SmartOrder[]): number {
    if (positionCount === 0) {
      return 0;
    }

    const averagePrice = orders.reduce(({ count, sum }, value) => {
      if (value.side.toLowerCase() === 'buy') {
        return { count: count + value.quantity, sum: sum + (value.price * value.quantity) };
      } else if (value.side.toLowerCase() === 'sell') {
        return { count: count - value.quantity, sum: sum - (value.price * value.quantity) };
      }
    }, { count: 0, sum: 0 });
    console.log('final: ', averagePrice);
    if (averagePrice.count <= 0 || averagePrice.sum <= 0) {
      return 0;
    }
    return Number((averagePrice.sum / averagePrice.count).toFixed(2));
  }
}
