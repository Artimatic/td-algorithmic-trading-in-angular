import { AfterViewInit, ViewChild } from '@angular/core';
import { Component } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import * as moment from 'moment';

import { Holding } from '../shared/models';
import { PortfolioTableComponent } from '../portfolio-table/portfolio-table.component';
import { CartService } from '../shared/services/cart.service';
import { MatSnackBar } from '@angular/material';
import { ExcelService } from '../shared/services/excel-service.service';
import { SmartOrder } from '../shared/models/smart-order';

@Component({
  selector: 'app-portfolio-view',
  templateUrl: './portfolio-view.component.html',
  styleUrls: ['./portfolio-view.component.css']
})
export class PortfolioViewComponent implements AfterViewInit {
  @ViewChild('sidenav', {static: false}) sidenav: MatSidenav;

  @ViewChild(PortfolioTableComponent, {static: false})
  private portfolioTableComponent: PortfolioTableComponent;

  portfolioData: Holding[];

  constructor(
    public cartService: CartService,
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

  exportPortfolio() {
    const today = moment().format('MM-DD-YY');
    console.log('export data: ', this.portfolioTableComponent.dataSource.data);
    this.excelService.exportAsExcelFile(this.portfolioTableComponent.dataSource.data, `portfolio_${today}`);
  }
}
