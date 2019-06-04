import { Component, OnInit, ViewChild, Input } from '@angular/core';
import { SmartOrder } from '../shared/models/smart-order';
import { Subscription } from 'rxjs';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';

import * as moment from 'moment-timezone';
import * as _ from 'lodash';
import { TimerObservable } from 'rxjs/observable/TimerObservable';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { MatDialog } from '@angular/material';
import { PortfolioService, DaytradeService, ReportingService, BacktestService } from '../shared';

@Component({
  selector: 'app-ml-card',
  templateUrl: './ml-card.component.html',
  styleUrls: ['./ml-card.component.css']
})
export class MlCardComponent implements OnInit {
  @ViewChild('stepper') stepper;
  @Input() bearishOrder: SmartOrder;
  @Input() bullishOrder: SmartOrder;

  sub: Subscription;
  checkReportSub: Subscription;

  alive: boolean;
  live: boolean;

  pendingResults: boolean;

  error: string;
  warning: string;

  interval: number;
  reportWaitInterval: number;
  holdingCount: number;

  firstFormGroup: FormGroup;
  secondFormGroup: FormGroup;

  startTime: moment.Moment;
  stopTime: moment.Moment;

  tiles;

  constructor(private _formBuilder: FormBuilder,
    private portfolioService: PortfolioService,
    private daytradeService: DaytradeService,
    private reportingService: ReportingService,
    private backtestService: BacktestService,
    public dialog: MatDialog) { }

  ngOnInit() {
    this.startTime = moment.tz('1:03pm', 'h:mma', 'America/New_York');
    this.stopTime = moment.tz('2:10pm', 'h:mma', 'America/New_York');

    this.holdingCount = 0;
    this.interval = 300000;
    // this.reportWaitInterval = 3600000;
    this.reportWaitInterval = 50000;

    this.live = false;
    this.alive = true;

    this.firstFormGroup = this._formBuilder.group({
      quantity: [1, Validators.required]
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
        const momentInst = moment();
        if (momentInst.isAfter(this.startTime) &&
          momentInst.isBefore(this.stopTime)) {
          this.alive = false;
          // moment().format('YYYY-MM-DD')
          this.backtestService.runRnn('SPY', '2019-05-31', '2010-01-01')
            .subscribe(() => {
              this.pendingResults = true;
              this.checkReportSub = TimerObservable.create(0, this.reportWaitInterval)
                .takeWhile(() => this.pendingResults)
                .subscribe(() => {
                  this.backtestService.getRnn('SPY', '2019-05-31')
                    .subscribe((data: any) => {
                      console.log('rnn data: ', data);
                    }, error => { });
                });
            }, error => {
              console.log('error: ', error);
              this.setWarning(error);
              this.stop();
            });
        }
      });
  }

  buy(order: SmartOrder) {
    return this.portfolioService.getQuote(order.holding.symbol)
      .toPromise()
      .then((quote) => {
        const lastPrice: number = 1 * quote.last_trade_price;
        const buyOrder = this.daytradeService.createOrder(order.holding, 'Buy', this.firstFormGroup.value.quantity, lastPrice, moment().unix());
        const log = `ORDER SENT ${moment(buyOrder.signalTime).format('hh:mm')} ${buyOrder.side} ${buyOrder.holding.symbol} ${buyOrder.quantity} ${buyOrder.price}`;

        const resolve = () => {
          this.holdingCount += this.firstFormGroup.value.quantity;
          console.log(`${moment().format('hh:mm')} ${log}`);
          this.reportingService.addAuditLog(order.holding.symbol, log);
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
    this.reportingService.addAuditLog('', `ML Card - ${message}`);
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
