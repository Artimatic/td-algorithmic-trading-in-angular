import { AfterViewInit, ViewChild } from '@angular/core';
import { Component, OnInit } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';

import { PortfolioService } from '../shared/services/portfolio.service';
import { Holding } from '../shared/models';
import { PortfolioTableComponent } from '../portfolio-table/portfolio-table.component';
import { AuthenticationService } from '../shared/services/authentication.service';
import { CartService } from '../shared/services/cart.service';
import { Order } from '../shared/models/order';
import { OrderRow } from '../shared/models/order-row';
import { MatSnackBar } from '@angular/material';

@Component({
  selector: 'app-portfolio-view',
  templateUrl: './portfolio-view.component.html',
  styleUrls: ['./portfolio-view.component.css']
})
export class PortfolioViewComponent implements AfterViewInit {
  @ViewChild('sidenav') sidenav: MatSidenav;

  @ViewChild(PortfolioTableComponent)
  private portfolioTableComponent: PortfolioTableComponent;

  portfolioData: Holding[];

  constructor(
    private portfolioService: PortfolioService,
    private authenticationService: AuthenticationService,
    private cartService: CartService,
    public snackBar: MatSnackBar) { }

  ngAfterViewInit() {
    this.refresh();
  }

  close(reason: string) {
    this.sidenav.close();
  }

  deleteSellOrder(deleteOrder: Order) {
    this.cartService.deleteSell(deleteOrder);
  }

  deleteBuyOrder(deleteOrder: Order) {
    this.cartService.deleteBuy(deleteOrder);
  }

  submitOrders() {
    this.cartService.submitOrders();
  }

  refresh() {
    this.authenticationService.getPortfolioAccount().subscribe(account => {
      this.portfolioService.getPortfolio()
        .subscribe(result => {
          this.portfolioTableComponent.setData(result);
        });
    })
  }

  import(file) {
    file.forEach((row: OrderRow) => {
      this.portfolioService.getInstruments(row.symbol).subscribe((response) => {
        let instruments = response.results[0];
        let newHolding: Holding = {
          instrument: instruments.url,
          symbol: instruments.symbol,
          name: instruments.name
        };

        let order: Order = {
          holding: newHolding,
          quantity: row.quantity,
          price: row.price,
          submitted: false,
          pending: false,
          side: row.side
        };
        this.cartService.addToCart(order);
      },
        (error) => {this.snackBar.open("Error getting instruments", 'Dismiss', {
          duration: 2000,
        });});
    });
  }
}
