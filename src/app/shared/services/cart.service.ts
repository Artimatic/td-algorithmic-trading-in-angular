import { Injectable } from '@angular/core';
import { PortfolioService } from './portfolio.service';
import { Order } from '../models/order';
import { MatSnackBar } from '@angular/material';

@Injectable()
export class CartService {
  sellOrders: Order[] = [];
  buyOrders: Order[] = [];
  sellTotal: number = 0;
  buyTotal: number = 0;

  constructor(
    private portfolioService: PortfolioService,
    public snackBar: MatSnackBar) { }

  addToCart(order: Order) {
    if (order.side.toLowerCase() === 'sell') {
      this.sellOrders.push(order);
      this.snackBar.open('Sell order added to cart', 'Dismiss', {
        duration: 2000,
      });
    } else if (order.side.toLowerCase() === 'buy') {
      this.buyOrders.push(order);
      this.snackBar.open('Buy order sent', 'Dismiss', {
        duration: 2000,
      });
    }
    this.calculateTotals();
  }

  deleteSell(deleteOrder: Order) {
    let index = this.sellOrders.findIndex((order) => {
      if (deleteOrder.price === order.price
        && deleteOrder.holding.symbol === order.holding.symbol
        && deleteOrder.quantity === order.quantity) {
        return true;
      }
      return false;
    });
    this.sellOrders.splice(index, 1);
    this.calculateTotals();
  }

  deleteBuy(deleteOrder: Order) {
    let index = this.buyOrders.findIndex((order) => {
      if (deleteOrder.price === order.price
        && deleteOrder.holding.symbol === order.holding.symbol
        && deleteOrder.quantity === order.quantity) {
        return true;
      }
      return false;
    });
    this.buyOrders.splice(index, 1);
    this.calculateTotals();
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
      if (!sell.submitted) {
        this.portfolioService.sell(sell.holding, sell.quantity, sell.price).subscribe(
          response => {
            this.snackBar.open('Sell order sent', 'Dismiss', {
              duration: 2000,
            });
            sell.pending = false;
            sell.submitted = true;
          },
          error => {
            this.snackBar.open('Unknown error');
            sell.pending = false;
            sell.submitted = false;
          });
      }
    });

    this.buyOrders.forEach((buy) => {
      buy.pending = true;
      if (!buy.submitted) {
        this.portfolioService.buy(buy.holding, buy.quantity, buy.price).subscribe(
          response => {
            this.snackBar.open('Buy order sent', 'Dismiss', {
              duration: 2000,
            });
            buy.pending = false;
            buy.submitted = true;
          },
          error => {
            this.snackBar.open('Unknown error');
            buy.pending = false;
            buy.submitted = false;
          });
      }
    });
  }
}
