import { Injectable } from '@angular/core';
import { PortfolioService } from './portfolio.service';
import { SmartOrder } from '../models/smart-order';
import { TradeService, AlgoQueueItem } from './trade.service';
import * as _ from 'lodash';
import { MessageService } from 'primeng/api';

@Injectable()
export class CartService {
  sellOrders: SmartOrder[] = [];
  buyOrders: SmartOrder[] = [];
  otherOrders: SmartOrder[] = [];

  constructor(
    private portfolioService: PortfolioService,
    private tradeService: TradeService,
    private messageService: MessageService) { }

  addToCart(order: SmartOrder, replaceAnyExistingOrders = false) {
    const indices = this.searchAllLists(order);
    let noDup = true;
    for (const idx of indices) {
      if (idx > -1) {
        const msg = `Order for ${order.holding.symbol} already exists`;
        console.log(msg);

        this.messageService.add({
          key: 'cart_dup',
          severity: 'danger',
          summary: msg
        });
        noDup = false;
        break;
      }
    }

    if (!noDup && replaceAnyExistingOrders) {
      if (indices[0] > -1) {
        this.deleteBuy(this.buildOrder(order.holding.symbol, null, null, 'buy'));
      } else if (indices[1] > -1) {
        this.deleteSell(this.buildOrder(order.holding.symbol, null, null, 'sell'));
      } else if (indices[2] > -1) {
        this.deleteDaytrade(this.buildOrder(order.holding.symbol, null, null, 'daytrade'));
      }
      this.addOrder(order);
    }

    if (noDup && order.quantity > 0) {
      if (order.side.toLowerCase() === 'sell') {
        this.sellOrders.push(order);
        console.log(`Added ${order.side} ${order.holding.symbol}`, order);

        this.messageService.add({
          key: 'cart_sell_add',
          severity: 'success',
          summary: 'Sell order added to cart'
        });
      } else if (order.side.toLowerCase() === 'buy') {
        this.buyOrders.push(order);
        console.log(`Added ${order.side} ${order.holding.symbol}`, order);
        this.messageService.add({
          key: 'cart_buy_add',
          severity: 'success',
          summary: 'Buy order added to cart'
        });
      } else {
        this.otherOrders.push(order);
        console.log(`Added ${order.side} ${order.holding.symbol}`, order);

        this.messageService.add({
          key: 'cart_daytrade_add',
          severity: 'success',
          summary: `Added ${order.side} ${order.holding.symbol}`
        });
      }
    }
  }

  deleteSell(deleteOrder: SmartOrder) {
    console.log('Deleting sell order', deleteOrder.holding.symbol);
    this.sellOrders = this.sellOrders.filter(fullOrder => fullOrder.holding.symbol !== deleteOrder.holding.symbol );
  }

  deleteBuy(deleteOrder: SmartOrder) {
    console.log('Deleting buy order', deleteOrder.holding.symbol);
    this.buyOrders = this.buyOrders.filter(fullOrder => fullOrder.holding.symbol !== deleteOrder.holding.symbol );
  }

  deleteDaytrade(deleteOrder: SmartOrder) {
    console.log('Deleting day trade', deleteOrder.holding.symbol);
    this.otherOrders = this.otherOrders.filter(fullOrder => fullOrder.holding.symbol !== deleteOrder.holding.symbol );
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
  }

  searchAllLists(targetOrder: SmartOrder) {
    const buyIndex = this.getOrderIndex(this.buyOrders, targetOrder);
    const sellIndex = this.getOrderIndex(this.sellOrders, targetOrder);
    const otherIndex = this.getOrderIndex(this.otherOrders, targetOrder);
    return [buyIndex, sellIndex, otherIndex];
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

  addOrder(order: SmartOrder) {
    switch (order.side.toLowerCase()) {
      case 'sell':
        this.sellOrders.push(order);
        break;
      case 'buy':
        this.buyOrders.push(order);
        break;
      case 'daytrade':
        this.otherOrders.push(order);
        break;
    }
  }

  getOrderIndex(orderList: SmartOrder[], targetOrder: SmartOrder) {
    return orderList.findIndex((order) => order.holding.symbol === targetOrder.holding.symbol);
  }

  deleteCart() {
    console.log('Delete cart');
    this.sellOrders = [];
    this.buyOrders = [];
    this.otherOrders = [];
  }

  submitOrders() {
    this.sellOrders.forEach((sell) => {
      sell.pending = true;
      if (!sell.submitted && sell.quantity > 0) {
        this.portfolioService.sell(sell.holding, sell.quantity, sell.price, 'limit').subscribe(
          response => {
            this.messageService.add({
              key: 'sell_sent',
              severity: 'success',
              summary: 'Sell order sent'
            });
            sell.pending = false;
            sell.submitted = true;
          },
          error => {
            console.log(error);
            this.messageService.add({
              key: 'sell_error',
              severity: 'danger',
              summary: `Sell error for ${sell.holding.symbol}`
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

            this.messageService.add({
              key: 'buy_sent',
              severity: 'success',
              summary: 'Buy order sent'
            });
            buy.pending = false;
            buy.submitted = true;
          },
          error => {
            console.log(error);
            this.messageService.add({
              key: 'buy_error',
              severity: 'danger',
              summary: `Buy error for ${buy.holding.symbol}`
            });
            
            buy.pending = false;
            buy.submitted = false;
          });
      }
    });
  }

  buildOrder(symbol: string, quantity = 0, price = 0, side = 'DayTrade', id = null): SmartOrder {
    return {
      holding: {
        instrument: null,
        symbol,
      },
      quantity,
      price,
      submitted: false,
      pending: false,
      orderSize: quantity || 1,
      side,
      lossThreshold: -0.01,
      profitTarget: 0.05,
      trailingStop: -0.003,
      useStopLoss: false,
      useTrailingStopLoss: false,
      useTakeProfit: false,
      sellAtClose: (side === 'DayTrade' || side === 'Sell') ? true : false,
      id
    };
  }
}
