import { Component, OnInit } from '@angular/core';
import { CartService } from '@shared/services/cart.service';

@Component({
  selector: 'app-orders-list',
  templateUrl: './orders-list.component.html',
  styleUrls: ['./orders-list.component.css']
})
export class OrdersListComponent implements OnInit {
  buyOrders = [];
  sellOrders = [];
  otherOrders =[];
  constructor(public cartService: CartService) { }

  ngOnInit() {
    this.cartService.cartObserver.subscribe(() => {
      this.buyOrders = this.cartService.buyOrders;
      this.sellOrders = this.cartService.sellOrders;
      this.otherOrders = this.cartService.otherOrders;
    });
  }

}
