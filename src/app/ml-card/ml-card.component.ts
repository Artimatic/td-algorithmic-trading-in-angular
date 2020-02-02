import { Component, OnInit, ViewChild } from '@angular/core';
import { SmartOrder } from '../shared/models/smart-order';
import { Subscription } from 'rxjs';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';

import * as moment from 'moment-timezone';
import * as _ from 'lodash';
import { TimerObservable } from 'rxjs/observable/TimerObservable';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { MatDialog, MatSnackBar } from '@angular/material';
import { PortfolioService, DaytradeService, ReportingService, BacktestService } from '../shared';
import { Holding } from '../shared/models';
import { GlobalSettingsService, Brokerage } from '../settings/global-settings.service';

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

  bullishPlay: FormControl;
  bearishPlay: FormControl;
  settings: FormControl;

  error: string;
  warning: string;

  interval: number;
  reportWaitInterval: number;
  holdingCount: number;

  firstFormGroup: FormGroup;
  secondFormGroup: FormGroup;
  longOnly = new FormControl();
  allIn = new FormControl();

  startTime: moment.Moment;
  stopTime: moment.Moment;

  tiles;

  testing = new FormControl();

  constructor(private _formBuilder: FormBuilder,
    private portfolioService: PortfolioService,
    private daytradeService: DaytradeService,
    private reportingService: ReportingService,
    private backtestService: BacktestService,
    public globalSettingsService: GlobalSettingsService,
    public snackBar: MatSnackBar,
    public dialog: MatDialog) { }

  ngOnInit() {
    this.startTime = moment.tz('5:01pm', 'h:mma', 'America/New_York');
    this.stopTime = moment.tz('6:00pm', 'h:mma', 'America/New_York');

    this.holdingCount = 0;

    this.interval = 600000;
    this.reportWaitInterval = 180000;

    this.live = false;
    this.alive = true;
    this.longOnly.setValue(false);
    this.allIn.setValue(false);
    this.testing.setValue(false);

    this.firstFormGroup = this._formBuilder.group({
      amount: [500, Validators.required]
    });

    this.secondFormGroup = this._formBuilder.group({
      secondCtrl: ['', Validators.required]
    });

    this.bullishPlay = new FormControl('SPY', [
      Validators.required
    ]);

    this.bearishPlay = new FormControl('TLT', [
      Validators.required
    ]);

    this.settings = new FormControl('closePositions', [
      Validators.required
    ]);

    this.setup();
  }

  trainModel() {
    this.backtestService.runRnn('SPY', moment().subtract({ day: 1 }).format('YYYY-MM-DD'), moment().subtract({ day: 300 }).format('YYYY-MM-DD')).subscribe();
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
    this.setup();
    this.alive = true;
    this.sub = TimerObservable.create(0, this.interval)
      .takeWhile(() => this.alive)
      .subscribe(() => {
        this.live = true;
        const momentInst = moment();
        if (momentInst.isAfter(this.startTime) &&
          momentInst.isBefore(this.stopTime) || this.testing.value) {
          this.alive = false;
          this.backtestService.activateRnn('SPY', this.getTradeDay())
            .subscribe(() => {
              this.pendingResults = true;
              this.checkReportSub = TimerObservable.create(0, this.reportWaitInterval)
                .takeWhile(() => this.pendingResults && this.live)
                .subscribe(() => {
                  this.backtestService.getRnn('SPY', this.getTradeDay())
                    .subscribe((data: any) => {
                      console.log('rnn data: ', this.getTradeDay(), data);

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
      if (prediction.nextOutput > 0.55) {
        bet.bullishOpen++;
      } else if (prediction.nextOutput < 0.45) {
        bet.bearishOpen++;
      }
      bet.total++;
    });

    const bullishRatio = _.floor(_.divide(bet.bullishOpen, bet.total), 2);
    const bearishRatio = _.floor(_.divide(bet.bearishOpen, bet.total), 2);

    if (bullishRatio > 0.6 || bearishRatio > 0.6) {
      if (bullishRatio > bearishRatio) {
        bet.summary = Sentiment.Bullish;
      } else if (bearishRatio > bullishRatio) {
        bet.summary = Sentiment.Bearish;
      } else {
        bet.summary = Sentiment.Neutral;
      }
    }

    this.reportingService.addAuditLog(null, bet);

    return bet;
  }

  getOrder(symbol: string) {
    return this.portfolioService.getInstruments(symbol).map((response) => {
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

      return order;
    });
  }

  placeBet(bet: Bet) {
    switch (bet.summary) {
      case Sentiment.Bullish:
        if (this.settings.value === 'closePositions') {
          this.getOrder(this.bearishPlay.value).subscribe((order) => {
            this.sellAll(order);
          },
            (error) => {
              this.snackBar.open(`Error getting instruments for ${this.bearishPlay}`, 'Dismiss', {
                duration: 2000,
              });
            });
        } else if (this.settings.value === 'openPositions') {
          this.getOrder(this.bullishPlay.value).subscribe((order) => {
            this.buy(order, _.divide(bet.bullishOpen, bet.total));
          },
            (error) => {
              this.snackBar.open(`Error getting instruments for ${this.bullishPlay}`, 'Dismiss', {
                duration: 2000,
              });
            });
        }

        break;
      case Sentiment.Bearish:
          if (this.settings.value === 'closePositions') {
            this.getOrder(this.bullishPlay.value).subscribe((order) => {
              this.sellAll(order);
            },
              (error) => {
                this.snackBar.open(`Error getting instruments for ${this.bullishPlay}`, 'Dismiss', {
                  duration: 2000,
                });
              });
          } else if (this.settings.value === 'openPositions' && !this.longOnly.value) {
          this.getOrder(this.bearishPlay.value).subscribe((order) => {
            this.buy(order, _.divide(bet.bearishOpen, bet.total));
          },
            (error) => {
              this.snackBar.open(`Error getting instruments for ${this.bearishPlay}`, 'Dismiss', {
                duration: 2000,
              });
            });
        }
        break;
      default:
        const log = 'Neutral position. No orders made.';
        this.reportingService.addAuditLog(null, log);
        this.setWarning(log);
        this.snackBar.open(log, 'Dismiss');
        break;
    }
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

  buy(order: SmartOrder, modifier: number) {
    return this.getQuote(order.holding.symbol)
      .subscribe((bid) => {
        if (this.globalSettingsService.brokerage === Brokerage.Td) {
          this.portfolioService.getTdBalance()
            .subscribe(balance => {
              const totalBalance = _.add(balance.cashBalance, balance.moneyMarketFund);
              let totalBuyAmount = this.firstFormGroup.value.amount;

              if (this.allIn.value === true || totalBuyAmount > totalBalance) {
                totalBuyAmount = totalBalance;
              }

              this.initiateBuy(modifier, totalBuyAmount, bid, order);
            });
        } else if (this.globalSettingsService.brokerage === Brokerage.Robinhood) {
          this.initiateBuy(modifier, this.firstFormGroup.value.amount, bid, order);
        }
      });
  }

  initiateBuy(modifier: number, totalBuyAmount: number, bid: number, order: SmartOrder) {
    const quantity = _.floor(modifier * this.calculateQuantity(totalBuyAmount, bid));
    const buyOrder = this.daytradeService.createOrder(order.holding, 'Buy', quantity, bid, moment().unix());
    const log = `ORDER SENT ${buyOrder.side} ${buyOrder.holding.symbol} ${buyOrder.quantity} ${buyOrder.price}`;

    const resolve = () => {
      this.holdingCount += quantity;
      console.log(`${moment().format('hh:mm')} ${log}`);
      this.reportingService.addAuditLog(order.holding.symbol, log);
    };

    const reject = (error) => {
      this.error = error._body;
    };
    this.portfolioService.extendedHoursBuy(buyOrder.holding, buyOrder.quantity, buyOrder.price).subscribe(
      response => {
        resolve();
      },
      error => {
        reject(error);
      });
    this.stop();
  }

  test() {
    this.portfolioService.getTdBalance().toPromise().then(data => { console.log(data); });
  }

  calculateQuantity(betSize: number, price: number) {
    return _.floor(_.divide(betSize, price));
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

  setTest() {
    if (this.testing.value) {
      this.interval = 1000;
      this.reportWaitInterval = 50000;
    }
  }

  activateAllIn() {
    if (this.allIn.value === true) {
      this.firstFormGroup.disable();
    } else {
      this.firstFormGroup.enable();
    }
  }
}
