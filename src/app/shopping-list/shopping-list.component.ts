import { Component, OnInit, OnDestroy } from '@angular/core';
import { CartService } from '../shared/services/cart.service';
import { SmartOrder } from '../shared/models/smart-order';
import { ScoreKeeperService, ReportingService, DaytradeService, PortfolioService } from '../shared';
import { MatDialog, MatSnackBar } from '@angular/material';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { TimerObservable } from 'rxjs/observable/TimerObservable';
import { Subscription } from 'rxjs/Subscription';

import * as moment from 'moment-timezone';
import * as _ from 'lodash';
import { Holding } from '../shared/models';
import { GlobalSettingsService } from '../settings/global-settings.service';
import { TradeService } from '../shared/services/trade.service';

@Component({
  selector: 'app-shopping-list',
  templateUrl: './shopping-list.component.html',
  styleUrls: ['./shopping-list.component.css']
})
export class ShoppingListComponent implements OnInit, OnDestroy {
  mu: SmartOrder;
  vti: SmartOrder;
  upro: SmartOrder;
  vxx: SmartOrder;
  uvxy: SmartOrder;
  sh: SmartOrder;
  spxu: SmartOrder;

  ordersStarted: number;
  interval: number;

  alive: boolean;

  sub: Subscription;

  constructor(public cartService: CartService,
    public scoreKeeperService: ScoreKeeperService,
    public dialog: MatDialog,
    private reportingService: ReportingService,
    private daytradeService: DaytradeService,
    public snackBar: MatSnackBar,
    private portfolioService: PortfolioService,
    public globalSettingsService: GlobalSettingsService,
    private tradeService: TradeService) { }

  ngOnInit() {
    this.interval = 70800;

    this.ordersStarted = 0;
    this.portfolioService.getInstruments('UPRO').subscribe((response) => {
      const instruments = response.results[0];
      const newHolding: Holding = {
        instrument: instruments.url,
        symbol: instruments.symbol,
        name: instruments.name
      };

      const order: SmartOrder = {
        holding: newHolding,
        quantity: 10,
        price: 28.24,
        submitted: false,
        pending: false,
        side: 'DayTrade',
        useTakeProfit: true,
        useStopLoss: true,
        lossThreshold: -0.002,
        profitTarget: 0.004,
        spyMomentum: true,
        sellAtClose: true
      };
      this.upro = order;
    },
    (error) => {
      this.snackBar.open('Error getting instruments for UPRO', 'Dismiss', {
        duration: 2000,
      });
    });

    this.vti = {
      holding:
      {
        instrument: 'https://api.robinhood.com/instruments/18226051-6bfa-4c56-bd9a-d7575f0245c1/',
        symbol: 'VTI',
        name: 'Vanguard Total Stock Market ETF',
        realtime_price: 125.46
      },
      quantity: 3, price: 125.46,
      submitted: false, pending: false,
      side: 'DayTrade',
      useTakeProfit: true,
      useStopLoss: true,
      stopped: false,
      lossThreshold: -0.005,
      profitTarget: 0.004,
      spyMomentum: true,
      sellAtClose: true,
      meanReversion1: true
    };

    this.vxx = {
      holding:
      {
        instrument: 'https://api.robinhood.com/instruments/55b9bfc4-c9e7-42ac-8478-73b0af48fad7/',
        symbol: 'VXX',
        name: 'iPath S&P 500 VIX Short-Term Futures ETN due 1/30/2019',
        realtime_price: 31.74
      },
      quantity: 60, price: 31.74,
      submitted: false, pending: false,
      side: 'DayTrade',
      useTakeProfit: true,
      useStopLoss: true,
      lossThreshold: -0.005,
      profitTarget: 0.004,
      spyMomentum: true,
      sellAtClose: true
    };

    this.uvxy = {
      holding:
      {
        instrument: 'https://api.robinhood.com/instruments/00e90099-4281-4c93-b50d-fbd4d2469821/',
        symbol: 'UVXY',
        name: 'ProShares Ultra VIX Short-Term Futures ETF',
        realtime_price: 9.65
      },
      quantity: 60, price: 9.65,
      submitted: false, pending: false,
      side: 'DayTrade',
      useTakeProfit: true,
      useStopLoss: true
    };

    this.mu = {
      holding:
      {
        instrument: 'https://api.robinhood.com/instruments/0a8a072c-e52c-4e41-a2ee-8adbd72217d3/',
        symbol: 'MU',
        name: 'Micron Technology, Inc. - Common Stock',
        realtime_price: 54.59000015258789
      },
      quantity: 60, price: 54.59000015258789,
      submitted: false, pending: false,
      side: 'Buy',
      useTakeProfit: true,
      useStopLoss: true,
      stopped: false,
      lossThreshold: -0.005,
      profitTarget: 0.004,
      spyMomentum: true,
      sellAtClose: true,
      meanReversion1: true
    };

    this.sh = {
      holding:
      {
        instrument: 'https://api.robinhood.com/instruments/625e3596-9e2e-49e7-a9bf-6cbbc9d72ecd/',
        symbol: 'SH',
        name: 'ProShares Short S&P500',
        realtime_price: 31.86
      },
      quantity: 12, price: 31.86,
      submitted: false, pending: false,
      side: 'DayTrade',
      useTakeProfit: true,
      useStopLoss: true,
      lossThreshold: -0.002,
      profitTarget: 0.004,
      spyMomentum: true,
      sellAtClose: true
    };

    this.portfolioService.getInstruments('SPXU').subscribe((response) => {
      const instruments = response.results[0];
      const newHolding: Holding = {
        instrument: instruments.url,
        symbol: instruments.symbol,
        name: instruments.name
      };

      const order: SmartOrder = {
        holding: newHolding,
        quantity: 10,
        price: 28.24,
        submitted: false,
        pending: false,
        side: 'DayTrade',
        useTakeProfit: true,
        useStopLoss: true,
        lossThreshold: -0.002,
        profitTarget: 0.004,
        spyMomentum: true,
        sellAtClose: true
      };
      this.spxu = order;
    },
    (error) => {
      this.snackBar.open('Error getting instruments', 'Dismiss', {
        duration: 2000,
      });
    });
  }

  ngOnDestroy() {
    this.cleanUp();
  }

  cleanUp() {
    if (this.sub) {
      this.sub.unsubscribe();
      this.sub = undefined;
    }
  }

  deleteSellOrder(deleteOrder: SmartOrder) {
    this.cartService.deleteSell(deleteOrder);
  }

  deleteBuyOrder(deleteOrder: SmartOrder) {
    this.cartService.deleteBuy(deleteOrder);
  }

  confirmStart(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '250px',
      data: { title: 'Confirm', message: 'Are you sure you want to execute all orders?' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const concat = this.cartService.sellOrders.concat(this.cartService.buyOrders);

        this.queueAlgos(concat.concat(this.cartService.otherOrders));
      }
    });
  }

  queueAlgos(orders: SmartOrder[]) {
    this.alive = true;
    let lastIndex = 0;
    const limit = 10;

    _.forEach(orders, (order: SmartOrder) => {
      order.init = true;
      order.stopped = false;
    });

    this.sub = TimerObservable.create(0, this.interval)
      .takeWhile(() => this.alive)
      .subscribe(() => {
        if (moment().isAfter(moment(this.globalSettingsService.startTime)) && moment().isBefore(moment(this.globalSettingsService.stopTime))) {
          let executed = 0;
          while (executed < limit && lastIndex < orders.length) {
            this.tradeService.algoQueue.next(orders[lastIndex].holding.symbol);
            lastIndex++;
            executed++;
          }
          if (lastIndex >= orders.length) {
            lastIndex = 0;
          }
          if (moment().isAfter(moment(this.globalSettingsService.stopTime)) && moment().isBefore(moment(this.globalSettingsService.stopTime).add(3, 'minutes'))) {
            const log = `Profit ${this.scoreKeeperService.total}`;
            this.reportingService.addAuditLog(null, log);
            this.reportingService.exportAuditHistory();
          }
        }
      });
  }

  stop() {
    this.alive = false;
  }

  closeAllTrades() {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '250px',
      data: { title: 'Confirm', message: 'Close all open day trade positions?' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const resolve = (data) => {
          console.log('close all resolved: ', data);
          this.snackBar.open('Open positions closed', 'Dismiss');
         };
        const reject = (error) => {
          console.log('close all error: ', error);
          this.snackBar.open('Unable to close all positions', 'Dismiss');
         };
        const handleNotFound = () => { };
        this.daytradeService.closeTrades(resolve, reject, handleNotFound);
      }
    });
  }

  stopAndDeleteOrders() {
    this.stop();
    this.cleanUp();
    const buySells = this.cartService.sellOrders.concat(this.cartService.buyOrders);

    _.forEach(buySells.concat(this.cartService.otherOrders), (order: SmartOrder) => {
      order.stopped = true;
    });

    this.cartService.deleteCart();
  }

  loadExamples() {
    this.cartService.addToCart(this.vti);
    this.cartService.addToCart(this.mu);
  }
}
