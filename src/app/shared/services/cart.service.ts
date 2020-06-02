import { Injectable } from '@angular/core';
import { PortfolioService } from './portfolio.service';
import { MatSnackBar } from '@angular/material';
import { SmartOrder } from '../models/smart-order';
import { TradeService, AlgoQueueItem } from './trade.service';
import * as _ from 'lodash';

@Injectable()
export class CartService {
  sellOrders: SmartOrder[] = [];
  buyOrders: SmartOrder[] = [];
  otherOrders: SmartOrder[] = [];
  sellTotal = 0;
  buyTotal = 0;

  constructor(
    private portfolioService: PortfolioService,
    private tradeService: TradeService,
    public snackBar: MatSnackBar) { }

  addToCart(order: SmartOrder) {
    const indices = this.searchAllLists(order);
    let noDup = true;
    for (const idx of indices) {
      if (idx > -1) {
        this.snackBar.open(`Order for ${order.holding.symbol} already exists`, 'Dismiss', {
          duration: 2000,
        });
        noDup = false;
        break;
      }
    }

    if (noDup && order.quantity > 0) {
      if (order.side.toLowerCase() === 'sell') {
        this.sellOrders.push(order);
        this.snackBar.open('Sell order added to cart', 'Dismiss', {
          duration: 2000,
        });
      } else if (order.side.toLowerCase() === 'buy') {
        this.buyOrders.push(order);
        this.snackBar.open('Buy order added to cart', 'Dismiss', {
          duration: 2000,
        });
      } else {
        this.otherOrders.push(order);
        this.snackBar.open(`${order.side} order added to cart`, 'Dismiss', {
          duration: 2000,
        });
      }
      this.calculateTotals();
    }
  }

  deleteSell(deleteOrder: SmartOrder) {
    const index = this.getOrderIndex(this.sellOrders, deleteOrder);
    this.sellOrders.splice(index, 1);
    this.calculateTotals();
  }

  deleteBuy(deleteOrder: SmartOrder) {
    const index = this.getOrderIndex(this.buyOrders, deleteOrder);
    this.buyOrders.splice(index, 1);
    this.calculateTotals();
  }

  updateOrder(updatedOrder: SmartOrder) {
    const indices: number[] = this.searchAllLists(updatedOrder);
    const lists = [this.buyOrders, this.sellOrders, this.otherOrders];

    indices.forEach((val, idx) => {
      if (val > -1) {
        lists[idx][val] = updatedOrder;
        const queueItem: AlgoQueueItem = {
          symbol: updatedOrder.holding.symbol,
          reset: false,
          updateOrder: true
        };

        this.tradeService.algoQueue.next(queueItem);
      }
    });

    this.calculateTotals();
  }

  searchAllLists(targetOrder: SmartOrder) {
    const buyIndex = this.getOrderIndex(this.buyOrders, targetOrder);
    const sellIndex = this.getOrderIndex(this.sellOrders, targetOrder);
    const otherIndex = this.getOrderIndex(this.otherOrders, targetOrder);
    return [buyIndex, sellIndex, otherIndex];
  }

  deleteDaytrade(deleteOrder: SmartOrder) {
    const index = this.otherOrders.findIndex((order) => {
      if (deleteOrder.price === order.price
        && deleteOrder.holding.symbol === order.holding.symbol
        && deleteOrder.quantity === order.quantity) {
        return true;
      }
      return false;
    });
    this.otherOrders.splice(index, 1);
    this.calculateTotals();
  }

  deleteOrder(order: SmartOrder) {
    switch (order.side.toLowerCase()) {
      case 'sell':
        this.deleteSell(order);
      break;
      case 'buy':
        this.deleteBuy(order);
      break;
      case 'daytrade':
        this.deleteDaytrade(order);
      break;
    }
  }

  getOrderIndex(orderList: SmartOrder[], targetOrder: SmartOrder) {
    return orderList.findIndex((order) => {
      if (order.holding.symbol === targetOrder.holding.symbol) {
        return true;
      }
      return false;
    });
  }

  deleteCart() {
    this.sellOrders = [];
    this.buyOrders = [];
    this.otherOrders = [];
  }


  calculateTotals() {
    this.buyTotal = this.buyOrders.reduce((acc, buy) => {
      return acc + (buy.quantity * buy.price);
    }, 0);

    this.sellTotal = this.sellOrders.reduce((acc, sell) => {
      return acc + (sell.quantity * sell.price);
    }, 0);
  }

  submitOrders() {
    this.sellOrders.forEach((sell) => {
      sell.pending = true;
      if (!sell.submitted && sell.quantity > 0) {
        this.portfolioService.sell(sell.holding, sell.quantity, sell.price, 'limit').subscribe(
          response => {
            this.snackBar.open('Sell order sent', 'Dismiss', {
              duration: 2000,
            });
            sell.pending = false;
            sell.submitted = true;
          },
          error => {
            this.snackBar.open('Unknown error', 'Dismiss', {
              duration: 2000,
            });
            sell.pending = false;
            sell.submitted = false;
          });
      }
    });

    this.buyOrders.forEach((buy) => {
      buy.pending = true;
      if (!buy.submitted && buy.quantity > 0) {
        this.portfolioService.buy(buy.holding, buy.quantity, buy.price, 'limit').subscribe(
          response => {
            this.snackBar.open('Buy order sent', 'Dismiss', {
              duration: 2000,
            });
            buy.pending = false;
            buy.submitted = true;
          },
          error => {
            this.snackBar.open('Unknown error', 'Dismiss', {
              duration: 2000,
            });
            buy.pending = false;
            buy.submitted = false;
          });
      }
    });
  }

  buildOrder(symbol: string, quantity = 0, price = 0, side = 'DayTrade'): SmartOrder {
    return {
      holding: {
        instrument: null,
        symbol,
      },
      quantity,
      price,
      submitted: false,
      pending: false,
      orderSize: _.floor(quantity / 3) || 1,
      side,
      lossThreshold: 0.004,
      profitTarget: 0.008,
      trailingStop: 0.003,
      useStopLoss: true,
      useTrailingStopLoss: false,
      useTakeProfit: true,
      sellAtClose: side === 'DayTrade' ? true : false
    };
  }
}
