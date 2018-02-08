import {Component, ViewChild} from '@angular/core';
import {MatSidenav} from '@angular/material/sidenav';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css']
})
export class CartComponent {
  @ViewChild('sidenav') sidenav: MatSidenav;

  constructor() { }

  reason = '';

  close(reason: string) {
    this.reason = reason;
    this.sidenav.close();
  }
}