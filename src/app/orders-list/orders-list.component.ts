import { Component, OnInit } from '@angular/core';
import { CartService } from '@shared/services/cart.service';

@Component({
  selector: 'app-orders-list',
  templateUrl: './orders-list.component.html',
  styleUrls: ['./orders-list.component.css']
})
export class OrdersListComponent implements OnInit {

  constructor(public cartService: CartService) { }

  ngOnInit() {
  }

}
