import { AfterViewInit, ViewChild } from '@angular/core';
import { Component, OnInit } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import * as moment from 'moment';

import { PortfolioService } from '../shared/services/portfolio.service';
import { Holding } from '../shared/models';
import { PortfolioTableComponent } from '../portfolio-table/portfolio-table.component';
import { AuthenticationService } from '../shared/services/authentication.service';
import { CartService } from '../shared/services/cart.service';
import { Order } from '../shared/models/order';
import { OrderRow } from '../shared/models/order-row';
import { MatSnackBar } from '@angular/material';
import { ExcelService } from '../shared/services/excel-service.service';
import { SmartOrder } from '../shared/models/smart-order';

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
    private excelService: ExcelService,
    public snackBar: MatSnackBar) { }

  ngAfterViewInit() {
  }

  close(reason: string) {
    this.sidenav.close();
  }

  deleteSellOrder(deleteOrder: SmartOrder) {
    this.cartService.deleteSell(deleteOrder);
  }

  deleteBuyOrder(deleteOrder: SmartOrder) {
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
    });
  }

  import(file) {
    file.forEach((row: OrderRow) => {
      this.portfolioService.getInstruments(row.symbol).subscribe((response) => {
        const instruments = response.results[0];
        const newHolding: Holding = {
          instrument: instruments.url,
          symbol: instruments.symbol,
          name: instruments.name
        };

        const order: SmartOrder = {
          holding: newHolding,
          quantity: row.quantity * 1,
          price: row.price,
          submitted: false,
          pending: false,
          side: row.side,
          lossThreshold: row.Stop * 1 || null,
          profitTarget: row.Target * 1 || null,
          useStopLoss: row.StopLoss || null,
          useTakeProfit: row.TakeProfit || null,
          useMomentum1: row.UseMomentum1 || null,
          useMomentum2: row.UseMomentum2 || null,
          orderSize: row.OrderSize * 1 || null
        };
        this.cartService.addToCart(order);
      },
        (error) => {
          this.snackBar.open('Error getting instruments', 'Dismiss', {
            duration: 2000,
          });
        });
    });
  }

  exportPortfolio() {
    const today = moment().format('MM-DD-YY');
    console.log('export data: ', this.portfolioTableComponent.dataSource.data);
    this.excelService.exportAsExcelFile(this.portfolioTableComponent.dataSource.data, `portfolio_${today}`);
  }
}
