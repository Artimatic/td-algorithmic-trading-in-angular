import { Component, OnInit, Input } from '@angular/core';

import { Validators, FormControl, FormGroupDirective, NgForm } from '@angular/forms';

import * as _ from 'lodash';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { PortfolioService, DaytradeService, ReportingService, BacktestService } from '../shared';
import { GlobalSettingsService } from '../settings/global-settings.service';

import * as moment from 'moment-timezone';
import { TimerObservable } from 'rxjs/observable/TimerObservable';
import { Subscription } from 'rxjs';
import { Holding } from '../shared/models';
import { SmartOrder } from '../shared/models/smart-order';
import { takeWhile } from 'rxjs/operators';
import { ErrorStateMatcher } from '@angular/material/core';

export class MyErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    const isSubmitted = form && form.submitted;
    return !!(control && control.invalid && (control.dirty || control.touched || isSubmitted));
  }
}

@Component({
  selector: 'app-neuro-card',
  templateUrl: './neuro-card.component.html',
  styleUrls: ['./neuro-card.component.css']
})
export class NeuroCardComponent implements OnInit {
  @Input() order: SmartOrder;

  alive: boolean;
  live: boolean;
  pendingResults: boolean;

  error: string;
  warning: string;

  interval: number;

  startTime: moment.Moment;
  stopTime: moment.Moment;

  stockFormControl: FormControl;
  testing = new FormControl();
  settings: FormControl;

  sub: Subscription;
  checkReportSub: Subscription;

  constructor(private portfolioService: PortfolioService,
    private daytradeService: DaytradeService,
    private reportingService: ReportingService,
    private backtestService: BacktestService,
    public globalSettingsService: GlobalSettingsService,
    public snackBar: MatSnackBar,
    public dialog: MatDialog) { }

  ngOnInit() {
    this.startTime = moment.tz('3:52pm', 'h:mma', 'America/New_York');
    this.stopTime = moment.tz('6:00pm', 'h:mma', 'America/New_York');

    this.interval = 300000;

    this.live = false;
    this.alive = true;
    this.testing.setValue(false);

    this.stockFormControl = new FormControl(this.order.holding.symbol, [
      Validators.required
    ]);

    this.settings = new FormControl('closePositions', [
      Validators.required
    ]);

    this.setup();
  }

  stop() {
    this.live = false;
    this.alive = false;
  }

  confirm(cb) {
    this.backtestService.getYahooIntraday(this.stockFormControl.value)
      .subscribe({
        next: cb,
        error: () => {
          this.stockFormControl.setErrors({ notFound: true });
        }
      });
  }

  trainModel() {
    const cb = () => {
      this.backtestService
        .runLstmV2(this.stockFormControl.value,
          moment().subtract({ day: 1 }).format('YYYY-MM-DD'),
          moment().subtract({ day: 300 }).format('YYYY-MM-DD')
        ).subscribe();
    };
    this.confirm(cb);
  }

  setup() {
    this.warning = '';
  }

  getTradeDay() {
    const momentObj = moment.tz('America/New_York');

    if (momentObj.day() === 6) {
      return momentObj.subtract({ day: 1 }).format('YYYY-MM-DD');
    } else if (momentObj.day() === 0) {
      return momentObj.subtract({ day: 2 }).format('YYYY-MM-DD');
    }
    console.log('Date:', momentObj, moment(), new Date());

    return momentObj.format('YYYY-MM-DD');
  }

  goLive() {
    const cb = () => {
      this.setup();
      this.alive = true;
      this.sub = TimerObservable.create(0, this.interval)
      .pipe(
        takeWhile(() => this.alive))
        .subscribe(() => {
          this.live = true;
          const momentInst = moment();
          if (momentInst.isAfter(this.startTime) &&
            momentInst.isBefore(this.stopTime) || this.testing.value) {
            this.alive = false;
            this.backtestService.activateLstmV2(this.stockFormControl.value)
              .subscribe((data) => {
                if (data) {
                  this.makeDecision(data);
                }
              }, error => {
                console.log('error: ', error);
                this.setWarning(error);
                this.stop();
              });
          }
        });
    };
    this.confirm(cb);
  }

  getOrder(symbol: string) {
    const newHolding: Holding = {
      instrument: null,
      symbol
    };

    const order: SmartOrder = {
      holding: newHolding,
      quantity: 0,
      price: 0,
      submitted: false,
      pending: false,
      side: 'DayTrade',
    };

    return order;
  }

  getQuote(symbol: string) {
    return this.portfolioService.getQuote(symbol)
      .map((quote) => {
        let bid: number = quote.price;

        if (_.round(_.divide(quote.askPrice, quote.bidPrice), 3) < 1.005) {
          bid = quote.askPrice;
        } else {
          bid = quote.price;
        }

        return bid;
      });
  }

  sellAll(order: SmartOrder) {
    const resolve = () => {
      this.snackBar.open(`Sell all ${order.holding.symbol} order sent`, 'Dismiss');
    };

    const reject = (error) => {
      this.error = error._body;
      this.snackBar.open(`Error selling ${order.holding.symbol}`, 'Dismiss');
    };

    const notFound = (error) => {
      this.error = error._body;
      this.snackBar.open(`${order.holding.symbol} position not found`, 'Dismiss');
    };
    return this.getQuote(order.holding.symbol)
      .subscribe((bid) => {
        order.price = bid;
        this.daytradeService.closePosition(order, 'limit', resolve, reject, notFound);
      });
  }


  makeDecision(predictionResults) {
    if (predictionResults.nextOutput < 0.4) {
      const order = this.getOrder(this.stockFormControl.value);
      this.sellAll(order);
    }
  }

  setWarning(message) {
    this.warning = message;
    this.reportingService.addAuditLog('', `Neuro card - ${message}`);
  }

  setTest() {
    if (this.testing.value) {
      this.interval = 1000;
    }
  }
}
