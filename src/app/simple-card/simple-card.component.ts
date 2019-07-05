import { Component, OnInit, ViewChild, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';
import { TimerObservable } from 'rxjs/observable/TimerObservable';
import { SmartOrder } from '../shared/models/smart-order';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { CartService } from '../shared/services/cart.service';
import { MatDialog } from '@angular/material';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import * as moment from 'moment-timezone';
import { DaytradeService, PortfolioService, ReportingService } from '../shared';
import { OrderPref } from '../shared/enums/order-pref.enum';

import * as _ from 'lodash';

@Component({
  selector: 'app-simple-card',
  templateUrl: './simple-card.component.html',
  styleUrls: ['./simple-card.component.css']
})
export class SimpleCardComponent implements OnInit, OnChanges {
  @ViewChild('stepper') stepper;
  @Input() order: SmartOrder;

  sub: Subscription;

  alive: boolean;
  live: boolean;

  error: string;
  warning: string;

  interval: number;
  holdingCount: number;

  firstFormGroup: FormGroup;
  secondFormGroup: FormGroup;

  marketOpenTime: moment.Moment;
  startTime: moment.Moment;

  marketCloseTime: moment.Moment;
  stopTime: moment.Moment;

  preferenceList: any[];

  preferences: FormControl;

  tiles;

  constructor(private _formBuilder: FormBuilder,
    private daytradeService: DaytradeService,
    private reportingService: ReportingService,
    public cartService: CartService,
    private portfolioService: PortfolioService,
    public dialog: MatDialog) { }

  ngOnInit() {
    this.marketOpenTime = moment.tz('9:30am', 'h:mma', 'America/New_York');
    this.startTime = moment.tz('9:36am', 'h:mma', 'America/New_York');

    this.stopTime = moment.tz('3:50pm', 'h:mma', 'America/New_York');
    this.marketCloseTime = moment.tz('4:00pm', 'h:mma', 'America/New_York');

    this.preferenceList = [
      OrderPref.BuyCloseSellOpen,
      OrderPref.SellAtOpen
    ];

    this.holdingCount = 0;
    this.interval = 300000;
    this.live = false;
    this.alive = true;

    this.firstFormGroup = this._formBuilder.group({
      quantity: [_.get(this.order, 'quantity', 10), Validators.required]
    });

    this.secondFormGroup = this._formBuilder.group({
      secondCtrl: ['', Validators.required]
    });

    this.preferences = new FormControl();
    this.preferences.setValue(OrderPref.BuyCloseSellOpen);
    this.setup();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.order.currentValue) {
      this.firstFormGroup = this._formBuilder.group({
        quantity: [this.order.quantity, Validators.required]
      });
    }
  }

  goLive() {
    console.log('pref: ', this.preferences.value, OrderPref.SellAtOpen, this.preferences.value === OrderPref.SellAtOpen);
    this.setup();
    this.alive = true;
    this.sub = TimerObservable.create(0, this.interval)
      .takeWhile(() => this.alive)
      .subscribe(() => {
        this.live = true;
        const momentInst = moment();
        if (momentInst.isAfter(this.stopTime) &&
          momentInst.isBefore(this.marketCloseTime)) {
          if (this.holdingCount < this.order.quantity) {
            if (this.preferences.value === OrderPref.BuyCloseSellOpen) {
              this.buy();
            }
          }
        } else if (momentInst.isAfter(this.marketOpenTime) &&
          momentInst.isBefore(this.startTime)) {
          if (this.preferences.value === OrderPref.BuyCloseSellOpen ||
              this.preferences.value === OrderPref.SellAtOpen) {
            this.sell();
          }
        }
      });
  }

  buy() {
    return this.portfolioService.getQuote(this.order.holding.symbol)
      .toPromise()
      .then((quote) => {
        const lastPrice: number = quote;
        const buyOrder = this.daytradeService.createOrder(this.order.holding, 'Buy', this.firstFormGroup.value.quantity, lastPrice, moment().unix());
        const log = `ORDER SENT ${moment(buyOrder.signalTime).format('hh:mm')} ${buyOrder.side} ${buyOrder.holding.symbol} ${buyOrder.quantity} ${buyOrder.price}`;

        const resolve = () => {
          this.holdingCount += this.firstFormGroup.value.quantity;
          console.log(`${moment().format('hh:mm')} ${log}`);
          this.reportingService.addAuditLog(this.order.holding.symbol, log);
        };

        const reject = (error) => {
          this.error = error._body;
          if (error.status !== 400) {
            this.stop();
          }
        };
        this.daytradeService.sendBuy(buyOrder, 'limit', resolve, reject);
      });
  }

  sell() {
    return this.portfolioService.getQuote(this.order.holding.symbol)
      .toPromise()
      .then((quote) => {
        const lastPrice: number = quote;

        const sellOrder = this.daytradeService.createOrder(this.order.holding, 'Buy', this.firstFormGroup.value.quantity, lastPrice, moment().unix());
        const log = `ORDER SENT ${sellOrder.side} ${sellOrder.holding.symbol} ${sellOrder.quantity} ${sellOrder.price}`;

        const resolve = () => {
          this.holdingCount -= this.holdingCount >= this.firstFormGroup.value.quantity ? this.firstFormGroup.value.quantity : 0;
          console.log(`${moment().format('hh:mm')} ${log}`);
          this.reportingService.addAuditLog(this.order.holding.symbol, log);
        };

        const reject = (error) => {
          this.error = error._body;
          if (error.status !== 400) {
            this.stop();
          }
        };

        const handleNotFound = () => {
          this.setWarning(`Trying to sell ${sellOrder.holding.symbol} position that doesn\'t exists`);
        };
        this.daytradeService.sendSell(sellOrder, 'market', resolve, reject, handleNotFound);
      });
  }

  delete() {
    this.order.stopped = true;
    this.alive = false;
    this.cartService.deleteOrder(this.order);
  }

  openDialog(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '250px',
      data: { title: 'Confirm', message: 'Are you sure you want to execute this order?' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.goLive();
      }
    });
  }

  setWarning(message) {
    this.warning = message;
    this.reportingService.addAuditLog(this.order.holding.symbol, `${this.order.holding.symbol} - ${message}`);
  }

  progress() {
    return Number((100 * (this.holdingCount / this.firstFormGroup.value.quantity)).toFixed(2));
  }

  stop() {
    this.alive = false;
    this.live = false;
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }

  resetStepper(stepper) {
    stepper.selectedIndex = 0;
    this.stop();
  }

  setup() {
    this.holdingCount = 0;
    this.warning = '';
  }
}
