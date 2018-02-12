import { Injectable } from '@angular/core';
import { PortfolioService } from './portfolio.service';
import { Order } from '../models/order';

@Injectable()
export class CartService {
  sellOrders: Order[];
  buyOrders: Order[];

  constructor(private portfolioService: PortfolioService) { }
  
  addToCart(order: Order) {
    if (order.side.toLowerCase() === 'sell') {
      this.sellOrders.push(order);
    } else if (order.side.toLowerCase() === 'buy') {
      this.buyOrders.push(order);
    }
  }

  submitOrders() {
  }
}
