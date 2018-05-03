import { Component, OnInit } from '@angular/core';
import { CartService } from '../shared/services/cart.service';
import { Order } from '../shared/models/order';

@Component({
  selector: 'app-bollinger-band',
  templateUrl: './bollinger-band.component.html',
  styleUrls: ['./bollinger-band.component.css']
})
export class BollingerBandComponent implements OnInit {
  test: Order;
  constructor(private cartService: CartService) { }

  ngOnInit() {
    this.test = {
      'holding':
        {
          'instrument': 'https://api.robinhood.com/instruments/0a8a072c-e52c-4e41-a2ee-8adbd72217d3/',
          'symbol': 'MU',
          'name': 'Micron Technology, Inc. - Common Stock',
          'realtime_price': 54.59000015258789
        },
      'quantity': 1, 'price': 54.59000015258789,
      'submitted': false, 'pending': false,
      'side': 'Buy'
    };
  }

  deleteSellOrder(deleteOrder: Order) {
    this.cartService.deleteSell(deleteOrder);
  }

  deleteBuyOrder(deleteOrder: Order) {
    this.cartService.deleteBuy(deleteOrder);
  }
}
