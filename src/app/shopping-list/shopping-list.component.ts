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
  defaultInterval = 70800;
  spy: SmartOrder;
  tlt: SmartOrder;

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
    this.interval = this.defaultInterval;

    this.ordersStarted = 0;
    this.portfolioService.getInstruments('SPY').subscribe((response) => {
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
        sellAtClose: true
      };
      this.spy = order;
    },
      (error) => {
        this.snackBar.open('Error getting instruments for UPRO', 'Dismiss', {
          duration: 2000,
        });
      });

    this.portfolioService.getInstruments('TLT').subscribe((response) => {
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
        sellAtClose: true
      };
      this.tlt = order;
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
        if (this.interval !== this.defaultInterval) {
          this.interval = this.defaultInterval;
        }

        if (moment().isAfter(moment(this.globalSettingsService.startTime)) &&
          moment().isBefore(moment(this.globalSettingsService.stopTime))) {
          let executed = 0;
          while (executed < limit && lastIndex < orders.length) {
            this.tradeService.algoQueue.next(orders[lastIndex].holding.symbol);
            lastIndex++;
            executed++;
          }
          if (lastIndex >= orders.length) {
            lastIndex = 0;
          }
        }
        if (moment().isAfter(moment(this.globalSettingsService.stopTime)) &&
            moment().isBefore(moment(this.globalSettingsService.stopTime).add(2, 'minutes'))) {
          if (this.reportingService.logs.length > 0) {
            const log = `Profit ${this.scoreKeeperService.total}`;
            this.reportingService.addAuditLog(null, log);
            this.reportingService.exportAuditHistory();
          }
          this.interval = moment().subtract(5, 'minutes').diff(moment(this.globalSettingsService.startTime), 'milliseconds');
          console.log('new interval: ', this.interval);
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
    this.cartService.addToCart(this.spy);
    this.cartService.addToCart(this.tlt);
  }
}
