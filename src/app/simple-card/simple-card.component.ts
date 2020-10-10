import { Component, OnInit, ViewChild, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';
import { TimerObservable } from 'rxjs/observable/TimerObservable';
import { SmartOrder } from '../shared/models/smart-order';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { CartService } from '../shared/services/cart.service';
import { MatDialog, MatSnackBar } from '@angular/material';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import * as moment from 'moment-timezone';
import { DaytradeService, PortfolioService, ReportingService, BacktestService } from '../shared';
import { OrderPref } from '../shared/enums/order-pref.enum';

import * as _ from 'lodash';
import { Holding } from '../shared/models';
import { GlobalSettingsService } from '../settings/global-settings.service';

interface BuyAt3Algo {
  purchaseSent: boolean;
}

@Component({
  selector: 'app-simple-card',
  templateUrl: './simple-card.component.html',
  styleUrls: ['./simple-card.component.css']
})
export class SimpleCardComponent implements OnInit, OnChanges {
  @ViewChild('stepper', {static: false}) stepper;
  @Input() order: SmartOrder;

  selectedOrder: FormControl;

  sub: Subscription;

  alive: boolean;
  live: boolean;

  error: string;
  warning: string;

  interval: number;
  holdingCount: number;

  firstFormGroup: FormGroup;
  secondFormGroup: FormGroup;
  testing = new FormControl();

  marketOpenTime: moment.Moment;
  startTime: moment.Moment;

  marketCloseTime: moment.Moment;
  stopTime: moment.Moment;

  preferenceList: any[];

  preferences: FormControl;

  buyAt3Algo: BuyAt3Algo;

  tiles;

  constructor(private _formBuilder: FormBuilder,
    private daytradeService: DaytradeService,
    private reportingService: ReportingService,
    public cartService: CartService,
    private portfolioService: PortfolioService,
    private backtestService: BacktestService,
    private globalSettingsService: GlobalSettingsService,
    public snackBar: MatSnackBar,
    public dialog: MatDialog) { }

  ngOnInit() {
    this.testing.setValue(false);

    this.live = false;
    this.alive = true;

    this.preferenceList = [
      OrderPref.BuyCloseSellOpen,
      OrderPref.SellAtOpen,
      OrderPref.BuyAt3SellBeforeClose
    ];

    this.firstFormGroup = this._formBuilder.group({
      quantity: [_.get(this.order, 'quantity', 10), Validators.required],
      selectedOrder: [this.order.holding.symbol]
    });

    this.secondFormGroup = this._formBuilder.group({
      secondCtrl: ['', Validators.required]
    });

    this.preferences = new FormControl();
    this.preferences.setValue(OrderPref.SellAtOpen);

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
          if (this.preferences.value === OrderPref.BuyCloseSellOpen) {
            this.sell();
          } else if (this.preferences.value === OrderPref.SellAtOpen) {
            this.sellAll(this.order);
          }
        } else {
          if (this.preferences.value === OrderPref.BuyAt3SellBeforeClose) {
            const buyTime = moment.tz('3:28pm', 'h:mma', 'America/New_York');
            const sellTime = moment.tz('3:45pm', 'h:mma', 'America/New_York');
            console.log('Buy at 3', this.buyAt3Algo.purchaseSent, momentInst.isAfter(sellTime));

            if (this.buyAt3Algo.purchaseSent && momentInst.isAfter(sellTime)) {
              console.log('Closing buy at 3');
              const resolve = () => {
                this.stop();
              };

              const reject = () => {
                this.stop();
              };

              const notFound = () => {
                this.stop();
              };
              this.daytradeService.sellAll(this.order,
                'market',
                resolve,
                reject,
                notFound);
            } else if ((momentInst.isAfter(buyTime) &&
              momentInst.isBefore(sellTime) && !this.buyAt3Algo.purchaseSent) || this.testing.value) {
              this.backtestService.getTdIntraday(this.order.holding.symbol)
                .subscribe((quotes) => {
                  const closeArr = this.prepareQuotes(quotes);
                  this.backtestService.getRsi(closeArr)
                    .subscribe((data) => {
                      const rsi = data[0][0];
                      console.log(`${this.order.holding.symbol} RSI: ${rsi}`);
                      if (rsi < 20 || (rsi > 33 && rsi < 38)) {
                        this.buy()
                          .then(() => {
                            this.buyAt3Algo.purchaseSent = true;
                          });
                      }
                    });
                });
            }


          }
        }
      });
  }

  prepareQuotes(quotes) {
    const closeArr = quotes.chart.result[0].indicators.quote[0].close;
    const closeSubArr = closeArr.slice(closeArr.length - 15);
    return closeSubArr;
  }

  buy() {
    return this.portfolioService.getPrice(this.order.holding.symbol)
      .toPromise()
      .then((quote) => {
        const lastPrice: number = quote;
        const buyOrder = this.daytradeService.createOrder(this.order.holding, 'Buy', this.firstFormGroup.value.quantity, lastPrice, moment().unix());
        const log = `ORDER SENT Buy ${buyOrder.holding.symbol} ${buyOrder.quantity} ${buyOrder.price}`;

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
    return this.portfolioService.getPrice(this.order.holding.symbol)
      .subscribe((bid) => {
        order.price = bid;
        this.daytradeService.closePosition(order, 'limit', resolve, reject, notFound);
      });
  }

  sell() {
    return this.portfolioService.getPrice(this.order.holding.symbol)
      .toPromise()
      .then((quote) => {
        const lastPrice: number = quote;

        const sellOrder = this.daytradeService.createOrder(this.order.holding, 'Buy', this.firstFormGroup.value.quantity, lastPrice, moment().unix());
        const log = `ORDER SENT Sell ${sellOrder.holding.symbol} ${sellOrder.quantity} ${sellOrder.price}`;

        const resolve = () => {
          this.holdingCount -= this.holdingCount >= this.firstFormGroup.value.quantity ? this.firstFormGroup.value.quantity : 0;
          console.log(`${moment().format('hh:mm')} ${log}`);
          this.reportingService.addAuditLog(this.order.holding.symbol, log);
          this.stop();
        };

        const reject = (error) => {
          this.error = error._body;
          if (error.status !== 400) {
            this.stop();
          }
        };

        const handleNotFound = () => {
          this.setWarning(`Trying to sell position that doesn\'t exists`);
          this.stop();
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
    this.marketOpenTime = moment.tz(`${this.globalSettingsService.getTradeDate().format('YYYY-MM-DD')} 09:30`, 'America/New_York');
    this.startTime = moment.tz(`${this.globalSettingsService.getTradeDate().format('YYYY-MM-DD')} 09:36`, 'America/New_York');

    this.stopTime = moment.tz(`${this.globalSettingsService.getTradeDate().format('YYYY-MM-DD')} 15:55`, 'America/New_York');
    this.marketCloseTime = moment.tz(`${this.globalSettingsService.getTradeDate().format('YYYY-MM-DD')} 16:00`, 'America/New_York');

    this.interval = 60000;
    this.holdingCount = 0;
    this.warning = '';
    this.buyAt3Algo = { purchaseSent: false };
  }

  selectStock(event) {
    this.portfolioService.getInstruments(event.value).subscribe((response) => {
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
      this.order = order;
    },
      (error) => {
        this.snackBar.open(`Error getting instruments for ${event.value}`, 'Dismiss', {
          duration: 2000,
        });
      });
  }

  setTest() {
    if (this.testing.value) {
      this.interval = 1000;
    }
  }
}
