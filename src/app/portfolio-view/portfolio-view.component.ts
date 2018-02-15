import { AfterViewInit, ViewChild } from '@angular/core';
import { Component, OnInit } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';

import { PortfolioService } from '../shared/services/portfolio.service';
import { Holding } from '../shared/models';
import { PortfolioTableComponent } from '../portfolio-table/portfolio-table.component';
import { AuthenticationService } from '../shared/services/authentication.service';
import { CartService } from '../shared/services/cart.service';
import { Order } from '../shared/models/order';

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
  folders = [
    {
      name: 'Photos',
      updated: new Date('1/1/16'),
    },
    {
      name: 'Recipes',
      updated: new Date('1/17/16'),
    },
    {
      name: 'Work',
      updated: new Date('1/28/16'),
    }
  ];
  notes = [
    {
      name: 'Vacation Itinerary',
      updated: new Date('2/20/16'),
    },
    {
      name: 'Kitchen Remodel',
      updated: new Date('1/18/16'),
    }
  ];

  constructor(
    private portfolioService: PortfolioService,
    private authenticationService: AuthenticationService,
    private cartService: CartService) { }

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
}
