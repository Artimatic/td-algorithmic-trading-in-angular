import { Component, OnInit, ViewChild } from '@angular/core';
import { SmartOrder } from '../shared/models/smart-order';
import { Subscription } from 'rxjs';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';

import * as moment from 'moment-timezone';
import * as _ from 'lodash';
import { TimerObservable } from 'rxjs/observable/TimerObservable';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { MatDialog, MatSnackBar } from '@angular/material';
import { PortfolioService, DaytradeService, ReportingService, BacktestService } from '../shared';
import { Holding } from '../shared/models';

interface Bet {
  total: number;
  bearishOpen: number;
  bullishOpen: number;
  summary: String;
}

enum Sentiment {
  Bullish = 'Bullish',
  Bearish = 'Bearish',
  Neutral = 'Neutral'
}

@Component({
  selector: 'app-ml-card',
  templateUrl: './ml-card.component.html',
  styleUrls: ['./ml-card.component.css']
})
export class MlCardComponent implements OnInit {
  @ViewChild('stepper') stepper;

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

  testing = false;

  constructor(private _formBuilder: FormBuilder,
    private portfolioService: PortfolioService,
    private daytradeService: DaytradeService,
    private reportingService: ReportingService,
    private backtestService: BacktestService,
    public snackBar: MatSnackBar,
    public dialog: MatDialog) { }

  ngOnInit() {
    this.startTime = moment.tz('5:30pm', 'h:mma', 'America/New_York');
    this.stopTime = moment.tz('6:00pm', 'h:mma', 'America/New_York');

    this.holdingCount = 0;
    if (this.testing) {
      this.interval = 1000;
      this.reportWaitInterval = 50000;
    } else {
      this.interval = 600000;
      this.reportWaitInterval = 180000;
    }

    this.live = false;
    this.alive = true;

    this.firstFormGroup = this._formBuilder.group({
      amount: [500, Validators.required]
    });

    this.secondFormGroup = this._formBuilder.group({
      secondCtrl: ['', Validators.required]
    });

    this.setup();
  }

  trainModel() {
    this.backtestService.runRnn('SPY', moment().subtract({day: 1 }).format('YYYY-MM-DD'), '1990-01-01').subscribe();
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
          momentInst.isBefore(this.stopTime) || this.testing) {
          this.alive = false;
          this.backtestService.activateRnn('SPY', moment().format('YYYY-MM-DD'))
            .subscribe(() => {
              this.pendingResults = true;
              this.checkReportSub = TimerObservable.create(0, this.reportWaitInterval)
                .takeWhile(() => this.pendingResults)
                .subscribe(() => {
                  this.backtestService.getRnn('SPY', moment().format('YYYY-MM-DD'))
                    .subscribe((data: any) => {
                      console.log('rnn data: ', data);
                      if (data) {
                        const bet = this.determineBet(data);
                        this.placeBet(bet);
                        this.pendingResults = false;
                      }
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

  determineBet(predictionResults) {
    const predictions = predictionResults[0].results;
    const bet: Bet = {
      total: 0,
      bearishOpen: 0,
      bullishOpen: 0,
      summary: Sentiment.Neutral
    };

    _.forEach(predictions, (prediction) => {
      if (prediction.nextOutput) {
        bet.bullishOpen++;
      } else {
        bet.bearishOpen++;
      }
      bet.total++;
    });

    const bullishRatio = _.round(_.divide(bet.bullishOpen, bet.total), 2);
    const bearishRatio = _.round(_.divide(bet.bearishOpen, bet.total), 2);

    if (bullishRatio > 0.6 || bearishRatio > 0.6) {
      if (bullishRatio > bearishRatio) {
        bet.summary = Sentiment.Bullish;
      } else {
        bet.summary = Sentiment.Bearish;
      }
    }

    return bet;
  }

  placeBet(bet: Bet) {
    switch (bet.summary) {
      case Sentiment.Bullish:
          this.portfolioService.getInstruments('UPRO').subscribe((response) => {
            const instruments = response.results[0];
            const newHolding: Holding = {
              instrument: instruments.url,
              symbol: instruments.symbol,
              name: instruments.name
            };

            const order: SmartOrder = {
              holding: newHolding,
              quantity: 0,
              price: 0,
              submitted: false,
              pending: false,
              side: 'DayTrade',
            };
            this.buy(order, _.divide(bet.bullishOpen, bet.total));
          },
          (error) => {
            this.snackBar.open('Error getting instruments for UPRO', 'Dismiss', {
              duration: 2000,
            });
          });
      break;
      case Sentiment.Bearish:
          this.portfolioService.getInstruments('SPXU').subscribe((response) => {
            const instruments = response.results[0];
            const newHolding: Holding = {
              instrument: instruments.url,
              symbol: instruments.symbol,
              name: instruments.name
            };

            const order: SmartOrder = {
              holding: newHolding,
              quantity: 0,
              price: 0,
              submitted: false,
              pending: false,
              side: 'DayTrade',
            };
            this.buy(order, _.divide(bet.bearishOpen, bet.total));
          },
          (error) => {
            this.snackBar.open('Error getting instruments for SPXU', 'Dismiss', {
              duration: 2000,
            });
          });
      break;
    }
  }

  buy(order: SmartOrder, modifier: number) {
    return this.portfolioService.getQuote(order.holding.symbol)
      .toPromise()
      .then((quote) => {
        const bid: number = quote.price;
        const quantity = _.round(modifier * this.calculateQuantity(this.firstFormGroup.value.amount, bid));
        const buyOrder = this.daytradeService.createOrder(order.holding, 'Buy', quantity, bid, moment().unix());
        const log = `ORDER SENT ${moment(buyOrder.signalTime).format('hh:mm')} ${buyOrder.side} ${buyOrder.holding.symbol} ${buyOrder.quantity} ${buyOrder.price}`;

        const resolve = () => {
          this.holdingCount += quantity;
          console.log(`${moment().format('hh:mm')} ${log}`);
          this.reportingService.addAuditLog(order.holding.symbol, log);
        };

        const reject = (error) => {
          this.error = error._body;
          if (error.status !== 400) {
            this.stop();
          }
        };
        this.portfolioService.extendedHoursBuy(buyOrder.holding, buyOrder.quantity, buyOrder.price).subscribe(
          response => {
            resolve();
          },
          error => {
            reject(error);
          });
      });
  }

  calculateQuantity(betSize: number, price: number) {
    return Math.ceil(_.divide(betSize, price));
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
