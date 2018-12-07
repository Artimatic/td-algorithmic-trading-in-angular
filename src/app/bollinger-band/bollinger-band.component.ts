import { Component, OnInit } from '@angular/core';
import { CartService } from '../shared/services/cart.service';
import { SmartOrder } from '../shared/models/smart-order';
import { ScoreKeeperService } from '../shared';
import { MatDialog } from '@angular/material';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { TimerObservable } from 'rxjs/observable/TimerObservable';
import { Subscription } from 'rxjs/Subscription';

import * as moment from 'moment';
import * as _ from 'lodash';

@Component({
  selector: 'app-bollinger-band',
  templateUrl: './bollinger-band.component.html',
  styleUrls: ['./bollinger-band.component.css']
})
export class BollingerBandComponent implements OnInit {
  mu: SmartOrder;
  vti: SmartOrder;
  spxl: SmartOrder;
  vxx: SmartOrder;
  uvxy: SmartOrder;

  ordersStarted: number;
  interval: number;

  alive: boolean;

  sub: Subscription;

  startTime: moment.Moment;
  endTime: moment.Moment;
  noonTime: moment.Moment;

  constructor(private cartService: CartService,
    public scoreKeeperService: ScoreKeeperService,
    public dialog: MatDialog) { }

  ngOnInit() {
    this.interval = 66000;
    this.startTime = moment('10:10am', 'h:mma');
    this.noonTime = moment('1:10pm', 'h:mma');
    this.endTime = moment('3:30pm', 'h:mma');

    this.ordersStarted = 0;
    this.spxl = {
      holding:
      {
        instrument: 'https://api.robinhood.com/instruments/496d6d63-a93d-4693-a5b5-d1e0a72d854f/',
        symbol: 'SPXL',
        name: 'Direxion Daily S&P 500  Bull 3x Shares',
        realtime_price: 49.52
      },
      quantity: 60, price: 49.52,
      submitted: false, pending: false,
      side: 'DayTrade',
      useTakeProfit: true,
      useStopLoss: true
    };

    this.vti = {
      holding:
      {
        instrument: 'https://api.robinhood.com/instruments/18226051-6bfa-4c56-bd9a-d7575f0245c1/',
        symbol: 'VTI',
        name: 'Vanguard Total Stock Market ETF',
        realtime_price: 145.69
      },
      quantity: 60, price: 145.69,
      submitted: false, pending: false,
      side: 'DayTrade',
      useTakeProfit: true,
      useStopLoss: true
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
      useStopLoss: true
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
      side: 'Buy'
    };
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
        // this.triggerOrder(this.cartService.sellOrders);
        // this.triggerOrder(this.cartService.buyOrders);
        // this.triggerOrder(this.cartService.otherOrders);
      }
    });
  }

  confirmBacktest(): void {
    this.triggerBacktest(this.cartService.sellOrders);
    this.triggerBacktest(this.cartService.buyOrders);
    this.triggerBacktest(this.cartService.otherOrders);
  }


  triggerOrder(orders: SmartOrder[]) {
    _.forEach(orders, (order: SmartOrder) => {
      const startDelay = 60000 * _.round(this.ordersStarted / 5, 0);

      console.log(`trigger start: ${order.holding.symbol} ${new Date()} ${startDelay}`);

      setTimeout(() => {
        console.log(`triggered: ${order.holding.symbol} ${new Date()} `);
        order.triggered = true;
      }, startDelay);

      this.ordersStarted++;
    });
  }

  triggerBacktest(orders: SmartOrder[]) {
    _.forEach(orders, (order: SmartOrder) => {
      order.triggeredBacktest = true;
    });
  }

  queueAlgos(orders: SmartOrder[]) {
    this.alive = true;
    let counter = 1;
    let lastIndex = 0;
    const limit = 5;

    _.forEach(orders, (order: SmartOrder) => {
      order.init = true;
    });

    this.sub = TimerObservable.create(0, this.interval)
      .takeWhile(() => this.alive)
      .subscribe(() => {
        let executed = 0;
        while (executed < limit) {
          if (lastIndex < orders.length) {
            orders[lastIndex].stepForward = counter;
          } else {
            lastIndex = 0;
            orders[lastIndex].stepForward = counter;
          }
          lastIndex++;
          counter++;
          executed++;
        }
        // if (moment().isAfter(this.endTime)) {
        //   this.stop();
        // }
      });
  }

  stop() {
    this.alive = false;
  }
}
