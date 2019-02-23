import { Component, OnInit } from '@angular/core';
import { MatTableDataSource, MatDialog } from '@angular/material';

import { PortfolioService } from '../shared/services/portfolio.service';
import { Holding } from '../shared/models';
import { BacktestService } from '../shared/services/backtest.service';
import { AuthenticationService } from '../shared/services/authentication.service';
import { OrderDialogComponent } from '../order-dialog/order-dialog.component';
@Component({
  selector: 'app-portfolio-table',
  templateUrl: './portfolio-table.component.html',
  styleUrls: ['./portfolio-table.component.css']
})
export class PortfolioTableComponent implements OnInit {

  portfolioData: Holding[];
  displayedColumns = ['name', 'symbol',
    'gainz', 'quantity',
    'average_buy_price', 'realtime_price',
    'Volume', 'diversification', 'created_at', 'updated_at'];
  dataSource = new MatTableDataSource();
  panelOpenState = false;

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
    const dialogRef = this.dialog.open(OrderDialogComponent, {
      width: '500px',
      height: '500px',
      data: { holding: row, side: 'Sell', }
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('Closed dialog', result);
    });
  }

  buy(row: Holding): void {
    const dialogRef = this.dialog.open(OrderDialogComponent, {
      width: '500px',
      height: '500px',
      data: { holding: row, side: 'Buy' }
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
          holding.symbol = result.symbol;
          holding.name = result.name;
          this.tickers.push(holding.symbol);
          this.backtestService.getLastPriceTiingo({ symbol: holding.symbol })
            .subscribe(tiingoQuote => {
              holding.realtime_price = tiingoQuote[0].last;
              holding.Volume = tiingoQuote[0].volume;
              if (this.authenticationService.myAccount && !this.authenticationService.myAccount.stocks) {
                this.authenticationService.myAccount.stocks = (holding.quantity * holding.realtime_price);
              } else if (this.authenticationService.myAccount) {
                this.authenticationService.myAccount.stocks += (holding.quantity * holding.realtime_price);
              }
              this.getCalculations();
            });
          return holding;
        });
    });
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


