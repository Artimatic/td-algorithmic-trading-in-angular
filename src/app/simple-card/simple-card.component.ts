import { Component, OnInit, ViewChild, Input } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';
import { TimerObservable } from 'rxjs/observable/TimerObservable';
import { SmartOrder } from '../shared/models/smart-order';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CartService } from '../shared/services/cart.service';
import { MatDialog } from '@angular/material';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import * as moment from 'moment';
import { DaytradeService, PortfolioService, ReportingService } from '../shared';

@Component({
  selector: 'app-simple-card',
  templateUrl: './simple-card.component.html',
  styleUrls: ['./simple-card.component.css']
})
export class SimpleCardComponent implements OnInit {
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

  tiles;

  constructor(private _formBuilder: FormBuilder,
    private daytradeService: DaytradeService,
    private reportingService: ReportingService,
    public cartService: CartService,
    private portfolioService: PortfolioService,
    public dialog: MatDialog) { }

  ngOnInit() {
    this.marketOpenTime = moment('9:30am', 'h:mma');
    this.marketCloseTime = moment('4:00pm', 'h:mma');
    this.startTime = moment('9:35am', 'h:mma');
    this.stopTime = moment('3:55pm', 'h:mma');

    this.holdingCount = 0;
    this.interval = 180000;
    this.live = false;
    this.alive = true;
    this.firstFormGroup = this._formBuilder.group({
      quantity: [this.order.quantity, Validators.required]
    });

    this.secondFormGroup = this._formBuilder.group({
      secondCtrl: ['', Validators.required]
    });

    this.setup();
  }

  goLive() {
    this.setup();
    this.alive = true;
    this.sub = TimerObservable.create(0, this.interval)
      .takeWhile(() => this.alive)
      .subscribe(() => {
        this.live = true;
        if (moment().utcOffset('-0400').isAfter(this.stopTime.utcOffset('-0400')) &&
          moment().utcOffset('-0400').isBefore(this.marketCloseTime.utcOffset('-0400'))) {
          this.buy();
        } else if (moment().utcOffset('-0400').isAfter(this.marketOpenTime.utcOffset('-0400')) &&
          moment().utcOffset('-0400').isBefore(this.startTime.utcOffset('-0400'))) {
          this.sell();
        } else if (moment().utcOffset('-0400').isAfter(this.marketCloseTime.utcOffset('-0400'))) {
          this.stop();
        }
      });
  }

  buy() {
    return this.portfolioService.getQuote(this.order.holding.symbol)
      .toPromise()
      .then((quote) => {
        const lastPrice: number = 1 * quote.last_trade_price;
        const buyOrder = this.daytradeService.createOrder(this.order.holding, 'Buy', this.order.quantity, lastPrice, moment().unix());
        const log = `ORDER SENT ${moment(buyOrder.signalTime).format('hh:mm')} ${buyOrder.side} ${buyOrder.holding.symbol} ${buyOrder.quantity} ${buyOrder.price}`;

        const resolve = () => {
          this.holdingCount += this.order.quantity;
          console.log(`${moment().format('hh:mm')} ${log}`);
          this.reportingService.addAuditLog(this.order.holding.symbol, log);
        };

        const reject = (error) => {
          this.error = error._body;
          if (error.status !== 400) {
            this.stop();
          }
        };
        this.daytradeService.sendBuy(buyOrder, 'market', resolve, reject);
      });
  }

  sell() {
    return this.portfolioService.getQuote(this.order.holding.symbol)
      .toPromise()
      .then((quote) => {
        const lastPrice: number = 1 * quote.last_trade_price;

        const sellOrder = this.daytradeService.createOrder(this.order.holding, 'Buy', this.order.quantity, lastPrice, moment().unix());
        const log = `ORDER SENT ${sellOrder.side} ${sellOrder.holding.symbol} ${sellOrder.quantity} ${sellOrder.price}`;

        const resolve = () => {
          this.holdingCount -= this.order.quantity;
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
