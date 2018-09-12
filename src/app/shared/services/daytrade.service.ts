import { Injectable } from '@angular/core';
import { BacktestService } from './backtest.service';
import { AuthenticationService } from './authentication.service';
import { PortfolioService } from './portfolio.service';
import { OrderPref } from '../enums/order-pref.enum';
import { SmartOrder } from '../models/smart-order';

import * as moment from 'moment';
import * as _ from 'lodash';

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

  estimateAverageBuyOrderPrice(orders: SmartOrder[]): number {
    if (orders.length === 0) {
      return 0;
    }

    const finalPositions: SmartOrder[] = [];

    _.forEach(orders, (currentOrder: SmartOrder) => {
      if (currentOrder.side.toLowerCase() === 'sell') {
        let sellSize: number = currentOrder.quantity;
        let i = 0;
        while (sellSize > 0 && i < finalPositions.length) {
          if (finalPositions[i].side.toLowerCase() === 'buy') {
            if (finalPositions[i].quantity > sellSize) {
              finalPositions[i].quantity -= sellSize;
              sellSize = 0;
            } else {
              const removed = finalPositions.shift();
              sellSize -= removed.quantity;
              i--;
            }
          }
          i++;
        }
      } else if (currentOrder.side.toLowerCase() === 'buy'){
        finalPositions.push(currentOrder);
      }
    });

    let sum = 0;
    let size = 0;

    _.forEach(finalPositions, (pos: SmartOrder) => {
      sum += _.multiply(pos.quantity, pos.price);
      size += pos.quantity;
    });

    if (sum === 0 || size === 0) {
      return 0;
    }

    return _.round(_.divide(sum, size), 2);
  }

  /*
  * Estimate the profit/loss of the last sell order
  */
  estimateSellProfitLoss(orders: SmartOrder[]) {
    const len = orders.length;
    if (len < 2) {
      return 0;
    }

    const lastOrder = orders[len - 1];

    if (lastOrder.side.toLowerCase() !== 'sell') {
      throw new Error(`Estimating sell p/l: ${orders[orders.length - 1]} is not a sell order.`);
    }

    const finalPositions: SmartOrder[] = [];

    for (let j = 0, c = len - 1; j < c; j++) {
      const currentOrder: SmartOrder = orders[j];
      if (currentOrder.side.toLowerCase() === 'sell') {
        let sellSize: number = currentOrder.quantity;
        let i = 0;
        while (sellSize > 0 && i < finalPositions.length) {
          if (finalPositions[i].side.toLowerCase() === 'buy') {
            if (finalPositions[i].quantity > sellSize) {
              finalPositions[i].quantity -= sellSize;
              sellSize = 0;
            } else {
              const removed = finalPositions.shift();
              sellSize -= removed.quantity;
              i--;
            }
          }
          i++;
        }
      } else if (currentOrder.side.toLowerCase() === 'buy') {
        finalPositions.push(currentOrder);
      }
    }

    let size = lastOrder.quantity;
    let cost = 0;

    _.forEach(finalPositions, (pos: SmartOrder) => {
      if (pos.quantity > size) {
        cost += _.multiply(size, pos.price);
        size = 0;
      } else {
        cost += _.multiply(pos.quantity, pos.price);
        size -= pos.quantity;
      }

      if (size <= 0) {
        return false;
      }
    });

    const lastOrderCost = _.multiply(lastOrder.quantity, lastOrder.price);

    return _.round(_.subtract(lastOrderCost, cost), 2);
  }
}
