import { Component, OnInit } from '@angular/core';
import { SmartOrder } from '../shared/models/smart-order';
import { Holding } from '../shared/models';
import { CartService } from '../shared/services/cart.service';

@Component({
  selector: 'app-pokerhand',
  templateUrl: './pokerhand.component.html',
  styleUrls: ['./pokerhand.component.scss']
})
export class PokerhandComponent implements OnInit {
  pokerhand: SmartOrder[];
  mouseOver: string;

  constructor(public cartService: CartService) { }

  ngOnInit() {
    const newHolding: Holding = {
      instrument: '',
      symbol: 'VTI',
      name: ''
    };

    const order: SmartOrder = {
      holding: newHolding,
      quantity: 10,
      price: 28.24,
      submitted: false,
      pending: false,
      side: 'DayTrade',
      useTakeProfit: true,
      useStopLoss: true,
      lossThreshold: -0.002,
      profitTarget: 0.004,
      sellAtClose: true
    };

    this.pokerhand = [
      order
    ];
  }

  onHoverOver(order: SmartOrder) {
    this.mouseOver = order.holding.symbol;
  }

  onHoverAway() {
    this.mouseOver = null;
  }

  delete(order: SmartOrder) {
    switch (order.side.toLowerCase()) {
      case 'daytrade': {
        this.cartService.deleteDaytrade(order);
        break;
      }
      case 'buy': {
        this.cartService.deleteBuy(order);
        break;
      }
      case 'sell': {
        this.cartService.deleteSell(order);
        break;
      }
    }
  }
}
