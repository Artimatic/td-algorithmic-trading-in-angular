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
import { OrderRow } from '../shared/models/order-row';
import { FormControl, Validators } from '@angular/forms';

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

  lastCheckedTime: string;

  simpleCardForm: FormControl;
  mlCardForm: FormControl;

  simpleCards: SmartOrder[];
  mlCards: SmartOrder[];

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

    this.simpleCardForm = new FormControl('', [
      Validators.required
    ]);

    this.mlCardForm = new FormControl('', [
      Validators.required
    ]);

    this.simpleCards = [{
      holding: {
        instrument: null,
        symbol: 'TLT'
      },
      quantity: 0,
      price: 0,
      submitted: false,
      pending: false,
      side: 'DayTrade',
    },
    {
      holding: {
        instrument: null,
        symbol: 'SPY'
      },
      quantity: 0,
      price: 0,
      submitted: false,
      pending: false,
      side: 'DayTrade',
    }];

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
        this.lastCheckedTime = moment().format('hh:mm');
        console.log('interval check: ', moment(), this.globalSettingsService.startTime, moment().isAfter(moment(this.globalSettingsService.startTime)) &&
          moment().isBefore(moment(this.globalSettingsService.stopTime)));
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
          trailingStop: row.TrailingStop || null,
          useStopLoss: row.StopLoss || null,
          useTrailingStopLoss: row.TrailingStopLoss || null,
          useTakeProfit: row.TakeProfit || null,
          buyCloseSellOpen: row.BuyCloseSellOpen || null,
          sellAtClose: row.SellAtClose || null,
          yahooData: row.YahooData || null,
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

  addSimpleCard() {
    this.portfolioService.getInstruments(this.simpleCardForm.value).subscribe((response) => {
      const instruments = response.results[0];
      const newHolding: Holding = {
        instrument: null,
        symbol: instruments.symbol
      };

      const order: SmartOrder = {
        holding: newHolding,
        quantity: 0,
        price: 0,
        submitted: false,
        pending: false,
        side: 'DayTrade',
      };
      this.simpleCards.push(order);
    },
      (error) => {
        this.snackBar.open(`Error getting instruments for ${this.simpleCardForm.value}`, 'Dismiss', {
          duration: 2000,
        });
      });
  }

  addMlCard() {
    this.portfolioService.getInstruments(this.mlCardForm.value).subscribe((response) => {
      const instruments = response.results[0];
      const newHolding: Holding = {
        instrument: null,
        symbol: instruments.symbol
      };

      const order: SmartOrder = {
        holding: newHolding,
        quantity: 0,
        price: 0,
        submitted: false,
        pending: false,
        side: 'DayTrade',
      };
      this.mlCards.push(order);
    },
      (error) => {
        this.snackBar.open(`Error getting instruments for ${this.simpleCardForm.value}`, 'Dismiss', {
          duration: 2000,
        });
      });
  }
}
