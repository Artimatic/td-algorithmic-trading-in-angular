import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { SmartOrder } from '../shared/models/smart-order';
import { Subscription, Subject } from 'rxjs';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';

import * as moment from 'moment-timezone';
import * as _ from 'lodash';
import { TimerObservable } from 'rxjs/observable/TimerObservable';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { MatDialog, MatSnackBar } from '@angular/material';
import { PortfolioService, DaytradeService, ReportingService, BacktestService } from '../shared';
import { Holding } from '../shared/models';
import { GlobalSettingsService, Brokerage } from '../settings/global-settings.service';

export interface StockAllocation {
  stock: string;
  allocation: number;
}

@Component({
  selector: 'app-ml-batch-card',
  templateUrl: './ml-batch-card.component.html',
  styleUrls: ['./ml-batch-card.component.css']
})
export class MlBatchCardComponent implements OnInit, OnDestroy {
  @ViewChild('stepper') stepper;

  sub: Subscription;

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

  testing = new FormControl();

  stockList: StockAllocation[];

  private bufferSubject: Subject<void>;
  private callChainSub: Subscription;
  private buffer: StockAllocation[];

  constructor(private _formBuilder: FormBuilder,
    private portfolioService: PortfolioService,
    private daytradeService: DaytradeService,
    private reportingService: ReportingService,
    private backtestService: BacktestService,
    public globalSettingsService: GlobalSettingsService,
    public snackBar: MatSnackBar,
    public dialog: MatDialog) { }

  ngOnInit() {
    this.live = false;
    this.alive = true;
    this.testing.setValue(false);

    this.firstFormGroup = this._formBuilder.group({
      amount: [1000, Validators.required],
      symbol: []
    });

    this.secondFormGroup = this._formBuilder.group({
      secondCtrl: ['', Validators.required]
    });

    this.setup();

    this.stockList = [
      { stock: 'FB', allocation: 0.1 },
      { stock: 'AAPL', allocation: 0.1 },
      { stock: 'AMZN', allocation: 0.1 },
      { stock: 'NFLX', allocation: 0.1 },
      { stock: 'GOOG', allocation: 0.1 },
      { stock: 'MSFT', allocation: 0.1 },
      { stock: 'AMD', allocation: 0.1 },
      { stock: 'NVDA', allocation: 0.1 },
      { stock: 'ABBV', allocation: 0.1 },
      { stock: 'EA', allocation: 0.1 }
    ];

    this.callChainSub = new Subscription();
    this.bufferSubject = new Subject();
    this.buffer = [];
  }

  getTrainingStocks() {
    return this.stockList;
  }

  trainModel() {
    this.stockList.forEach((alloc: StockAllocation) => {
      this.buffer.push(alloc);
    });

    this.bufferSubject.subscribe(() => {
      const bufferItem = this.buffer[0];
      this.callChainSub.add(this.backtestService.runLstmV3(bufferItem.stock.toUpperCase(),
        moment().format('YYYY-MM-DD'),
        moment().subtract({ day: 365 }).format('YYYY-MM-DD'),
        0.7,
        '0,0,1,0,0,1,1,1,1,1,1,0,0').subscribe(() => {
          this.buffer.shift();
          this.triggerNext();
        }, error => {
          console.log(`ML training ${bufferItem.stock.toUpperCase()} failed. Trying again.`);
          this.alive = true;
          this.buffer.shift();
          this.triggerNext();
        }));
    });

    this.triggerNext();
  }

  triggerNext() {
    if (this.buffer.length > 0) {
      this.bufferSubject.next();
    }
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
          this.pendingResults = true;
          this.runActivationQueue();
          this.alive = false;
        }
      });
  }



  runActivationQueue() {
    this.stockList.forEach((alloc: StockAllocation) => {
      this.buffer.push(alloc);
    });

    this.bufferSubject.subscribe(() => {
      const bufferItem = this.buffer[0];
      this.sendActivation(bufferItem.stock.toUpperCase())
        .subscribe((data: any) => {
          console.log('rnn data: ', this.getTradeDay(), data);

          if (data) {
            if (this.isBullish(data)) {
              this.placeBet(bufferItem.stock.toUpperCase(), bufferItem.allocation);
              this.pendingResults = false;
            }
          }
          this.buffer.shift();
          this.triggerNext();
        }, error => {
          console.log(`ML activation ${bufferItem.stock.toUpperCase()} failed. Trying again.`);
          this.alive = true;
          this.buffer.shift();
          this.triggerNext();
        });
    });

    this.triggerNext();
  }

  isBullish(prediction) {
    if (prediction.nextOutput > 0.55) {
      return true;
    } else {
      return false;
    }
  }

  getOrder(symbol: string) {
    const newHolding: Holding = {
      instrument: null,
      symbol,
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

  placeBet(stock: string, allocation: number) {

    this.buy(this.getOrder(stock), allocation);
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

              if (totalBuyAmount > totalBalance) {
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
    this.startTime = moment.tz(`${this.globalSettingsService.getTradeDate().format('YYYY-MM-DD')} 15:55`, 'America/New_York');
    this.stopTime = moment.tz(`${this.globalSettingsService.getTradeDate().format('YYYY-MM-DD')} 16:00`, 'America/New_York');

    this.holdingCount = 0;
    this.warning = '';
    this.holdingCount = 0;

    this.interval = 300000;
    this.reportWaitInterval = 180000;
  }

  setTest() {
    if (this.testing.value) {
      this.interval = 1000;
      this.reportWaitInterval = 50000;
    }
  }

  sendActivation(stock) {
    return this.backtestService.activateLstmV3(stock, '0,0,1,0,0,1,1,1,1,1,1,0,0');
  }

  ngOnDestroy() {
    this.callChainSub.unsubscribe();
  }
}
