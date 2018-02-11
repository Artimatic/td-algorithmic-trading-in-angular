import { Component, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatPaginator, MatSort, MatTableDataSource, MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { Observable } from 'rxjs/Observable';

import { PortfolioService } from '../shared/services/portfolio.service';
import { Holding } from '../shared/models';
import { BacktestService } from '../shared/services/backtest.service';
import { Account } from '../shared/account';
import { AuthenticationService } from '../shared/services/authentication.service';
import { OrderDialogComponent } from '../order-dialog/order-dialog.component';
@Component({
  selector: 'app-portfolio-table',
  templateUrl: './portfolio-table.component.html',
  styleUrls: ['./portfolio-table.component.css']
})
export class PortfolioTableComponent implements OnInit {
  @Output() addCart = new EventEmitter<Holding>();

  portfolioData: Holding[];
  displayedColumns = ['name', 'symbol', 'gainz', 'quantity', 'average_buy_price', 'realtime_price', 'Volume', 'PERatio', 'realtime_chg_percent', 'diversification', 'created_at', 'updated_at'];
  dataSource = new MatTableDataSource();
  panelOpenState: boolean = false;

  tickers = [];
  resultsLength = 0;
  isLoadingResults = false;
  isRateLimitReached = false;

  constructor(
    private portfolioService: PortfolioService,
    private backtestService: BacktestService,
    private authenticationService: AuthenticationService,
    public dialog: MatDialog) { }

  ngOnInit() {
  }

  sell(row: Holding): void {
    let dialogRef = this.dialog.open(OrderDialogComponent, {
      width: '500px',
      height: '500px',
      data: {holding: row, side: 'Sell'}
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('Closed dialog', result);
    });
  }

  buy(row: Holding): void {
    let dialogRef = this.dialog.open(OrderDialogComponent, {
      width: '500px',
      height: '500px',
      data: {holding: row, side: 'Buy'}
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('Closed dialog', result);
    });
  }

  setData(data) {
    this.tickers = [];
    this.dataSource.data = data;
    this.dataSource.data.map((holding: Holding) => {
      return this.portfolioService.getResource(holding.instrument)
        .subscribe(result => {
          holding.symbol = result.symbol
          holding.name = result.name;
          this.tickers.push(holding.symbol);
          this.getCurrentPrice();
          return holding;
        });
    });
  }

  getCurrentPrice() {
    if (this.tickers.length >= this.dataSource.data.length) {
      this.backtestService.getPrice({ tickers: this.tickers })
        .subscribe(result => {
          this.dataSource.data.map((holding: Holding) => {
            let myQuote = result.query.results.quote.find(quote => {
              return quote.symbol === holding.symbol;
            });
            if (myQuote) {
              holding.realtime_price = myQuote.realtime_price;
              holding.Volume = myQuote.Volume;
              holding.PERatio = myQuote.PERatio;
              holding.realtime_chg_percent = myQuote.realtime_chg_percent;
              if (this.authenticationService.myAccount && !this.authenticationService.myAccount.stocks) {
                this.authenticationService.myAccount.stocks = (holding.quantity * holding.realtime_price);
              } else if (this.authenticationService.myAccount) {
                this.authenticationService.myAccount.stocks += (holding.quantity * holding.realtime_price);
              }
            }
            return holding;
          });
          this.getCalculations();
        });
    }
  }

  getCalculations() {
    this.dataSource.data.map((holding: Holding) => {
      holding.gainz = (holding.realtime_price - holding.average_buy_price) / holding.average_buy_price;
      if (this.authenticationService.myAccount) {
        holding.diversification = (holding.quantity * holding.realtime_price) / this.authenticationService.myAccount.stocks;
      }
      return holding;
    });
  }
}


