import { Component, OnInit, ViewChild, Input } from '@angular/core';
import { SmartOrder } from '../shared/models/smart-order';
import * as moment from 'moment';
import * as _ from 'lodash';

import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { MatDialog } from '@angular/material';

import {
  BacktestService,
  DaytradeService,
  ReportingService,
  ScoreKeeperService
} from '../shared';

import { Chart } from 'angular-highcharts';
import { DataPoint } from 'highcharts';
import * as Highcharts from 'highcharts';
import { TimerObservable } from 'rxjs/observable/TimerObservable';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { Subscription } from '../../../node_modules/rxjs/Subscription';
import { Order } from '../shared/models/order';

@Component({
  selector: 'app-seesaw-card',
  templateUrl: './seesaw-card.component.html',
  styleUrls: ['./seesaw-card.component.css']
})
export class SeesawCardComponent implements OnInit {
  @ViewChild('stepper') stepper;
  @Input() order: SmartOrder;
  @Input() orderInverse: SmartOrder;
  alive: boolean;
  live: boolean;
  backtestLive: boolean;
  showGraph: boolean;

  interval: number;
  bbandPeriod: number;
  buyCount: number;
  sellCount: number;
  positionCount: number;

  error: string;
  selectedRange: string;
  dataInterval: string;
  warning: string;

  firstFormGroup: FormGroup;
  orders: SmartOrder[] = [];
  currentPosition: Order;
  sub: Subscription;

  startTime: any;
  endTime: any;
  backtestLongQuotes: any;
  backtestShortQuotes: any;
  chart: any;

  constructor(private _formBuilder: FormBuilder,
    private backtestService: BacktestService,
    private daytradeService: DaytradeService,
    private reportingService: ReportingService,
    private scoringService: ScoreKeeperService,
    public dialog: MatDialog) { }

  ngOnInit() {
    this.alive = true;
    this.interval = 300000;
    this.live = false;
    this.error = '';
    this.backtestLive = false;
    this.selectedRange = '1d';
    Highcharts.setOptions({
      global: {
        useUTC: false
      }
    });
    this.startTime = moment('10:10am', 'h:mma');
    this.endTime = moment('3:50pm', 'h:mma');
    this.showGraph = false;
    this.bbandPeriod = 80;
    this.dataInterval = '1min';

    this.firstFormGroup = this._formBuilder.group({
      quantity: [this.order.quantity, Validators.required],
      lossThreshold: [this.order.lossThreshold || -0.003, Validators.required],
      profitTarget: [{ value: this.order.profitTarget || 0.003, disabled: false }, Validators.required],
      orderSize: [this.order.orderSize || this.daytradeService.getDefaultOrderSize(this.order.quantity), Validators.required],
      orderType: [this.order.side, Validators.required],
      preferences: []
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

  newRun(live, backtestLive) {
    this.setup();
    this.play(live, backtestLive);
  }

  async requestQuotes() {
    const quoteRequest = {
      ticker: this.order.holding.symbol,
      interval: '1m',
      range: this.selectedRange
    };

    const quoteInverseRequest = {
      ticker: this.orderInverse.holding.symbol,
      interval: '1m',
      range: this.selectedRange
    };

    this.backtestLongQuotes = await this.backtestService.getQuote(quoteRequest).toPromise();
    this.backtestLongQuotes = await this.backtestService.getQuote(quoteInverseRequest).toPromise();
  }

  async play(live, backtestLive) {
    this.live = live;
    this.backtestLive = backtestLive;

    let longData, shortData;

    if (live) {
      const quoteRequest = {
        symbol: this.order.holding.symbol,
        interval: this.dataInterval
      };

      const quoteInverseRequest = {
        symbol: this.orderInverse.holding.symbol,
        interval: this.dataInterval
      };

      longData = await this.backtestService.getIntraday2(quoteRequest).toPromise();
      shortData = await this.backtestService.getIntraday2(quoteInverseRequest).toPromise();

    } else if (this.backtestLongQuotes.length && this.backtestShortQuotes.length) {
      longData = this.daytradeService.convertHistoricalQuotes(this.backtestLongQuotes);
      shortData = this.daytradeService.convertHistoricalQuotes(this.backtestShortQuotes);
    }

    const timestamps1 = _.get(longData, 'chart.result[0].timestamp'),
      dataLength = timestamps1.length,
      quotes = _.get(longData, 'chart.result[0].indicators.quote[0]'),
      inverseQuotes = _.get(shortData, 'chart.result[0].indicators.quote[0]');

    if (this.live) {
      if (dataLength > this.bbandPeriod) {
        const lastIndex = dataLength - 1;
        const firstIndex = dataLength - this.bbandPeriod;
        this.runStrategy(quotes, inverseQuotes, timestamps1, firstIndex, lastIndex);
      }
    }

    this.chart = this.initPriceChart(this.order.holding.symbol, this.order.holding.name);

    for (let i = 0; i < dataLength; i += 1) {
      const closePrice = quotes.close[i];

      const point: DataPoint = {};

      point.x = moment.unix(timestamps1[i]).valueOf(); // the date
      point.y = closePrice; // close

      if (!this.live && i > this.bbandPeriod) {
        const lastIndex = i;
        const firstIndex = i - this.bbandPeriod;
        await this.runStrategy(quotes, inverseQuotes, timestamps1, firstIndex, lastIndex);
      }

      const foundOrder = this.orders.find((order) => {
        return point.x === order.signalTime;
      });

      if (foundOrder) {
        if (foundOrder.side.toLowerCase() === 'buy') {
          point.marker = {
            symbol: 'triangle',
            fillColor: 'green',
            radius: 5
          };
        } else if (foundOrder.side.toLowerCase() === 'sell') {
          point.marker = {
            symbol: 'triangle-down',
            fillColor: 'red',
            radius: 5
          };
        }
      }

      this.chart.addPoint(point);
    }

    // TODO: Use moment timezones
    if (moment().isAfter(this.endTime)) {
      this.reportingService.addAuditLog(this.order.holding.symbol, `Final Orders ${this.order.holding.name}`);
      this.stop();
    }
  }

  initPriceChart(title, subtitle): Chart {
    return new Chart({
      chart: {
        type: 'spline',
        marginLeft: 40, // Keep all charts left aligned
        marginTop: 0,
        marginBottom: 0,
        width: 800,
        height: 175
      },
      title: {
        text: '',
        style: {
          display: 'none'
        }
      },
      subtitle: {
        text: '',
        style: {
          display: 'none'
        }
      },
      legend: {
        enabled: false
      },
      xAxis: {
        type: 'datetime',
        dateTimeLabelFormats: {
          second: '%H:%M:%S',
          minute: '%H:%M',
          hour: '%H:%M'
        },
        labels: {
          formatter: function () {
            return moment(this.value).format('hh:mm');
          }
        }
      },
      yAxis: {
        endOnTick: false,
        startOnTick: false,
        labels: {
          enabled: false
        },
        title: {
          text: null
        },
        tickPositions: [0]
      },
      tooltip: {
        crosshairs: true,
        shared: true,
        formatter: function () {
          return moment(this.x).format('hh:mm') + '<br><b>Price:</b> ' + this.y + '<br>' + this.x;
        }
      },
      plotOptions: {
        spline: {
          marker: {
            radius: 1,
            lineColor: '#666666',
            lineWidth: 1
          }
        },
        series: {
          marker: {
            enabled: true
          }
        }
      },
      series: [{
        name: title,
        id: title,
        data: []
      }]
    });
  }

  goLive() {
    this.setup();
    this.alive = true;
    this.sub = TimerObservable.create(0, this.interval)
      .takeWhile(() => this.alive)
      .subscribe(() => {
        this.live = true;
        // TODO: Use moment timezones
        if (moment().isAfter(this.startTime)) {
          this.play(true, this.backtestLive);
        }
      });
  }

  progress() {
    return Number((100 * (this.buyCount + this.sellCount / this.firstFormGroup.value.quantity)).toFixed(2));
  }

  stop() {
  }

  setup() {
    this.orders = [];
    this.warning = '';
  }

  async runStrategy(quotes, inverseQuotes, timestamps, firstIdx, lastIdx) {
    const { firstIndex, lastIndex } = this.daytradeService.findMostCurrentQuoteIndex(quotes.close, firstIdx, lastIdx);
    const reals = quotes.close.slice(firstIndex, lastIndex + 1);
    if (!quotes.close[lastIndex]) {
      const log = `Quote data is missing ${reals.toString()}`;
      this.reportingService.addAuditLog(this.order.holding.symbol, log);
      return null;
    }
    const band = await this.daytradeService.getBBand(reals, this.bbandPeriod);
    return this.buildOrder(band, quotes, inverseQuotes, timestamps, lastIndex);
  }

  buildOrder(band: any[], quotes, inverseQuotes, timestamps, idx): Order[] {
    const signalTime = timestamps[idx],
      closePrice = quotes.close[idx],
      closeInversePrice = inverseQuotes.close[idx],
      orders: Order[] = [];

    switch (this.getDecision(band, quotes, inverseQuotes, idx)) {
      case 'stoploss':
        const stopLossOrder = this.daytradeService.createOrder(this.currentPosition.holding,
          'Sell',
          this.positionCount,
          closePrice,
          signalTime
        );
        this.sendSell(stopLossOrder);
        orders.push(stopLossOrder);

        if (this.currentPosition.holding.symbol === this.orderInverse.holding.symbol) {
          const inverse = this.daytradeService.createOrder(this.orderInverse.holding,
            'Buy',
            this.firstFormGroup.value.quantity,
            closeInversePrice,
            signalTime
          );
          this.sendBuy(inverse);
          orders.push(inverse);
        }
        break;
      case 'buy':
        const long = this.daytradeService.createOrder(this.order.holding,
          'Buy',
          this.firstFormGroup.value.quantity,
          closePrice,
          signalTime
        );
        this.sendBuy(long);
        orders.push(long);
        break;
      case 'sell':
        const short = this.daytradeService.createOrder(this.orderInverse.holding,
          'Buy',
          this.firstFormGroup.value.quantity,
          closePrice,
          signalTime
        );
        this.sendBuy(short);
        orders.push(short);
        break;
      case 'profit':
        let price;
        if (this.currentPosition.holding.symbol === this.orderInverse.holding.symbol) {
          price = quotes.close[idx];
        } else if (this.currentPosition.holding.symbol === this.order.holding.symbol) {
          price = inverseQuotes.close[idx];
        }

        const profit = this.daytradeService.createOrder(this.currentPosition.holding,
          'Sell',
          this.currentPosition.quantity,
          price,
          signalTime
        );

        this.sendSell(profit);
        orders.push(profit);
        break;
    }
    return orders;
  }

  getDecision(band: any[], quotes, inverseQuotes, idx): string {
    const upper = band[2],
      lower = band[0];

    if (_.isNil(this.currentPosition)) {
      if (quotes.high[idx] > upper) {
        return 'sell';
      } else if (quotes.low[idx] < lower) {
        return 'buy';
      }
    } else if (this.currentPosition) {
      let gains, closePrice;
      if (this.currentPosition.holding.symbol === this.orderInverse.holding.symbol) {
        gains = this.daytradeService.getPercentChange(quotes.close[idx], this.currentPosition.price);
        closePrice = quotes.close[idx];
      } else if (this.currentPosition.holding.symbol === this.order.holding.symbol) {
        gains = this.daytradeService.getPercentChange(inverseQuotes.close[idx], this.currentPosition.price);
        closePrice = inverseQuotes.close[idx];
      }

      if (gains < this.firstFormGroup.value.lossThreshold) {
        this.setWarning('Loss threshold met. Sending stop loss order. Estimated loss: ' +
          `${this.daytradeService.convertToFixedNumber(gains, 4) * 100}%`);
        this.reportingService.addAuditLog(this.order.holding.symbol,
          `${this.order.holding.symbol} Stop Loss triggered: ${quotes.close[idx]}/${this.currentPosition.price}`);
        return 'stoploss';
      } else if (gains > this.firstFormGroup.value.profitTarget) {
        this.setWarning(`Profits met. Realizing profits. Estimated gain: ${this.daytradeService.convertToFixedNumber(gains, 4) * 100}%`);
        this.reportingService.addAuditLog(this.order.holding.symbol,
          `${this.order.holding.symbol} PROFIT HARVEST TRIGGERED: ${closePrice}/${this.currentPosition.price}`);
        return 'profit';
      }
    }
  }

  sendBuy(order: SmartOrder) {
    const log = `ORDER SENT ${order.side} ${order.holding.symbol} ${order.quantity} ${order.price}`;

    if (this.backtestLive || this.live) {
      const resolve = (response) => {
        this.incrementBuy(order);

        console.log(`${moment().format('hh:mm')} ${log}`);
        this.reportingService.addAuditLog(order.holding.symbol, log);
      };

      const reject = (error) => {
        this.error = error._body;
        if (error.status !== 400) {
          this.stop();
        }
      };
      this.daytradeService.sendBuy(order, 'market', resolve, reject);
    } else {
      this.incrementBuy(order);
      console.log(`${moment().format('hh:mm')} ${log}`);
      this.reportingService.addAuditLog(order.holding.symbol, log);
    }
    return order;
  }

  sendSell(order: SmartOrder) {
    const log = `ORDER SENT ${order.side} ${order.holding.symbol} ${order.quantity} ${order.price}`;
    if (this.backtestLive || this.live) {
      const resolve = (response) => {
        this.incrementSell(order);

        const pl = this.daytradeService.estimateSellProfitLoss(this.orders);
        this.scoringService.addProfitLoss(this.order.holding.symbol, pl);

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
        this.removeOrder(order);
        this.setWarning(`Trying to sell ${order.holding.symbol} position that doesn\'t exists`);
      };

      this.daytradeService.sendSell(order, 'limit', resolve, reject, handleNotFound);

    } else {
      this.incrementSell(order);

      const pl = this.daytradeService.estimateSellProfitLoss(this.orders);
      this.scoringService.addProfitLoss(this.order.holding.symbol, pl);

      console.log(`${moment().format('hh:mm')} ${log}`);
      this.reportingService.addAuditLog(this.order.holding.symbol, log);
    }
    return order;
  }

  sendStopLoss(order: SmartOrder) {
    const log = `STOP LOSS ORDER SENT ${order.side} ${order.holding.symbol} ${order.quantity} ${order.price}`;
    if (this.backtestLive || this.live) {

      const resolve = (response) => {
        this.incrementSell(order);

        const pl = this.daytradeService.estimateSellProfitLoss(this.orders);
        this.scoringService.addProfitLoss(this.order.holding.symbol, pl);

        console.log(`${moment().format('hh:mm')} ${log}`);
        this.reportingService.addAuditLog(this.order.holding.symbol, log);
      };

      const reject = (error) => {
        this.error = error._body;
        this.stop();
      };

      const handleNotFound = () => {
        this.removeOrder(order);
        this.setWarning(`Trying to sell ${order.holding.symbol} position that doesn\'t exists`);
      };


      this.daytradeService.sendSell(order, 'market', resolve, reject, handleNotFound);
    } else {
      this.incrementSell(order);

      const pl = this.daytradeService.estimateSellProfitLoss(this.orders);
      this.scoringService.addProfitLoss(this.order.holding.symbol, pl);

      console.log(`${moment().format('hh:mm')} ${log}`);
      this.reportingService.addAuditLog(this.order.holding.symbol, log);
    }

    return order;
  }

  incrementBuy(order) {
    this.orders.push(order);
    this.buyCount += order.quantity;
    this.positionCount += order.quantity;
    this.currentPosition = order;
  }

  incrementSell(order) {
    this.orders.push(order);
    this.sellCount += order.quantity;
    this.positionCount -= order.quantity;
    this.currentPosition = null;
  }

  removeOrder(oldOrder) {
    const orderToBeRemoved = this.orders.findIndex((o) => {
      return oldOrder.signalTime === o.signalTime;
    });

    if (orderToBeRemoved > -1) {
      this.orders.splice(orderToBeRemoved, 1);
    }
    if (oldOrder.side.toLowerCase() === 'sell') {
      this.sellCount -= oldOrder.quantity;
      this.positionCount += oldOrder.quantity;
    } else if (oldOrder.side.toLowerCase() === 'buy') {
      this.buyCount -= oldOrder.quantity;
      this.positionCount -= oldOrder.quantity;
    }
  }

  setWarning(message) {
    this.warning = message;
    this.reportingService.addAuditLog(this.order.holding.symbol, `${this.order.holding.symbol} - ${message}`);
  }
}
