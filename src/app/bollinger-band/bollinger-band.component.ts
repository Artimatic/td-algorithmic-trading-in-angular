import { Component, OnInit } from '@angular/core';
import { CartService } from '../shared/services/cart.service';
import { Order } from '../shared/models/order';

@Component({
  selector: 'app-bollinger-band',
  templateUrl: './bollinger-band.component.html',
  styleUrls: ['./bollinger-band.component.css']
})
export class BollingerBandComponent implements OnInit {

  constructor(private cartService: CartService) { }

  ngOnInit() {
  }

  deleteSellOrder(deleteOrder: Order) {
    this.cartService.deleteSell(deleteOrder);
  }

  deleteBuyOrder(deleteOrder: Order) {
    this.cartService.deleteBuy(deleteOrder);
  }
}
