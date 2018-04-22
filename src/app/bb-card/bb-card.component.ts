import { Component, OnDestroy, EventEmitter, Input, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/concat';
import 'rxjs/add/observable/defer';
import 'rxjs/add/observable/merge';
import 'rxjs/add/observable/of';
import 'rxjs/add/operator/concatMap';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/takeWhile';

import { Chart } from 'angular-highcharts';
import { DataPoint, SeriesOptions } from 'highcharts';
import * as Highcharts from 'highcharts';

import * as moment from 'moment';

import { OrderPref } from '../shared/enums/order-pref.enum';
import {
  BacktestService,
  PortfolioService,
  AuthenticationService,
  DaytradeService
} from '../shared';
import { Order } from '../shared/models/order';
import { TimerObservable } from 'rxjs/observable/TimerObservable';
import { SmartOrder } from '../shared/models/smart-order';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { Subscription } from 'rxjs/Subscription';

@Component({
  selector: 'app-bb-card',
  templateUrl: './bb-card.component.html',
  styleUrls: ['./bb-card.component.css']
})
export class BbCardComponent implements OnDestroy, OnInit {
  @ViewChild('stepper') stepper;
  @Input() order: SmartOrder;
  chart: Chart;
  volumeChart: Chart;
  alive: boolean;
  live: boolean;
  interval: number;
  orders: SmartOrder[] = [];
  buyCount: number;
  sellCount: number;
  positionCount: number;
  firstFormGroup: FormGroup;
  secondFormGroup: FormGroup;
  sub: Subscription;
  sides: string[];
  error: string;
  color: string;
  warning: string;
  backtestLive: boolean;
  lastPrice: number;
  preferenceList: any[];
  config;
  showGraph;
  tiles;

  constructor(private _formBuilder: FormBuilder,
    private backtestService: BacktestService,
    private portfolioService: PortfolioService,
    private authenticationService: AuthenticationService,
    private daytradeService: DaytradeService,
    public dialog: MatDialog) {
    this.alive = true;
    this.interval = 300000;
    this.live = false;
    this.sides = ['Buy', 'Sell', 'DayTrade'];
    this.error = '';
    this.backtestLive = false;
    this.preferenceList = [OrderPref.TakeProfit, OrderPref.StopLoss];
    Highcharts.setOptions({
      global: {
        useUTC: false
      }
    });
    this.showGraph = false;
  }

  ngOnInit() {
    this.firstFormGroup = this._formBuilder.group({
      quantity: [this.order.quantity, Validators.required],
      lossThreshold: [-0.01, Validators.required],
      profitThreshold: [{ value: 0.01, disabled: false }, Validators.required],
      orderSize: [this.daytradeService.getDefaultOrderSize(this.order.quantity), Validators.required],
      orderType: [this.order.side, Validators.required],
      preferences: ''
    });

    this.secondFormGroup = this._formBuilder.group({
      secondCtrl: ['', Validators.required]
    });

    this.setup();
  }

  resetStepper(stepper) {
    stepper.selectedIndex = 0;
    this.stop();
  }

  progress() {
    return Number((100 * (this.buyCount + this.sellCount / this.firstFormGroup.value.quantity)).toFixed(2));
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

  confirmLiveBacktest(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '250px',
      data: { title: 'Confirm', message: 'Are you sure you want to send real orders in backtest?' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.newRun(false, true);
      }
    });
  }

  goLive() {
    this.setup();
    this.alive = true;
    this.sub = TimerObservable.create(0, this.interval)
      .takeWhile(() => this.alive)
      .subscribe(() => {
        this.live = true;
        this.play(true, this.backtestLive);
      });
  }

  newRun(live, backtestLive) {
    this.setup();
    this.play(live, backtestLive);
  }

  async play(live, backtestLive) {
    this.live = live;
    this.backtestLive = backtestLive;

    const requestBody = {
      symbol: this.order.holding.symbol,
      interval: '2m'
    };

    const quoteRequestBody = {
      ticker: this.order.holding.symbol,
      interval: '2m'
    };

    const data = await this.backtestService.getIntraday(requestBody).toPromise();

    if (data.chart.result[0].timestamp) {
      const volume = [],
        timestamps = data.chart.result[0].timestamp,
        dataLength = timestamps.length,
        quotes = data.chart.result[0].indicators.quote[0];

      if (this.live) {
        if (moment().format('hh:mm') === '04:00') {
          if (dataLength > 80) {
            const real = quotes.close.slice(dataLength - 81, dataLength);
            const band = await this.daytradeService.getBBand(real);
            this.buildOrder(band, quotes, timestamps, dataLength - 1);
          }
        }
      }

      this.chart = this.initPriceChart(this.order.holding.symbol, this.order.holding.name);

      for (let i = 0; i < dataLength; i += 1) {
        const closePrice = quotes.close[i];

        const point: DataPoint = {};

        point.x = moment.unix(timestamps[i]).valueOf(); // the date
        point.y = closePrice; // close

        if (!this.live && i > 80) {
          const real = quotes.close.slice(i - 81, i);
          const band = await this.daytradeService.getBBand(real);
          const order = this.buildOrder(band, quotes, timestamps, i - 1);
          if (order) {
            if (order.side.toLowerCase() === 'buy') {
              point.marker = {
                symbol: 'triangle',
                fillColor: 'green',
                radius: 5
              };
            } else if (order.side.toLowerCase() === 'sell') {
              point.marker = {
                symbol: 'triangle-down',
                fillColor: 'red',
                radius: 5
              };
            }
          }
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

        volume.push([
          moment.unix(timestamps[i]).valueOf(), // the date
          quotes.volume[i] // the volume
        ]);
      }
      console.log(this.orders, moment().format('hh:mm'));

      this.tiles = this.daytradeService.buildTileList(this.orders);
      console.log('tiles: ', this.tiles);
      this.volumeChart = this.initVolumeChart('Volume', volume);
    }
  }

  initVolumeChart(title, data): Chart {
    return new Chart({
      chart: {
        type: 'column',
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
          return moment(this.x).format('hh:mm') + '<br><b>Volume:</b> ' + this.y + '<br>' + this.points[0].key;
        }
      },
      series: [
        {
          name: 'Volume',
          id: 'volume',
          data: data
        }]
    });
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

  stop() {
    this.alive = false;
    this.live = false;
    this.backtestLive = false;
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }

  setup() {
    this.buyCount = 0;
    this.sellCount = 0;
    this.positionCount = 0;
    this.orders = [];
    this.config = this.daytradeService.parsePreferences(this.firstFormGroup.value.preferences);
    this.warning = '';

    switch (this.firstFormGroup.value.orderType.side) {
      case 'Buy':
        this.color = 'primary';
        break;
      case 'Sell':
        this.color = 'warn';
        break;
      default:
        this.color = 'accent';
    }
  }

  incrementBuy(order) {
    this.orders.push(order);
    this.buyCount += order.quantity;
    this.positionCount += order.quantity;
  }

  incrementSell(order) {
    this.orders.push(order);
    this.sellCount += order.quantity;
    this.positionCount -= order.quantity;
  }

  sendBuy(buyOrder: SmartOrder) {
    if (buyOrder) {
      if (this.backtestLive || this.live) {
        this.incrementBuy(buyOrder);

        const resolve = (response) => {
          console.log('BUY SENT', buyOrder.holding, buyOrder.quantity, buyOrder.price, moment().format('hh:mm'));
        };

        const reject = (error) => {
          this.error = error.message;
          this.stop();
        };
        this.daytradeService.sendBuy(buyOrder, resolve, reject);
      } else {
        console.log('BUY SENT', buyOrder.holding, buyOrder.quantity, buyOrder.price, moment().format('hh:mm'));
        this.incrementBuy(buyOrder);
      }
    }
    return buyOrder;
  }

  sendSell(sellOrder: SmartOrder) {
    if (sellOrder) {
      if (this.backtestLive || this.live) {
        this.incrementSell(sellOrder);
        const resolve = (response) => {
          console.log('SELL SENT', sellOrder.holding, sellOrder.quantity, sellOrder.price, moment().format('hh:mm'));
        };

        const reject = (error) => {
          this.error = error.message;
          this.stop();
        };

        const handleNotFound = () => {
          this.removeOrder(sellOrder);
          this.warning = `Trying to sell ${sellOrder.holding.symbol} position that doesn\'t exists`;
        };

        this.daytradeService.sendSell(sellOrder, resolve, reject, handleNotFound);

      } else {
        console.log('SELL SENT', sellOrder.holding, sellOrder.quantity, sellOrder.price, moment().format('hh:mm'));
        this.incrementSell(sellOrder);
      }
    }
    return sellOrder;
  }

  sendStopLoss(order: SmartOrder) {
    if (order) {
      if (this.backtestLive || this.live) {
        this.incrementSell(order);

        const resolve = (response) => {
          console.log('STOP LOSS SELL SENT', order.holding, order.quantity, order.price, moment().format('hh:mm'));
        };

        const reject = (error) => {
          this.error = error.message;
          this.stop();
        };

        const handleNotFound = () => {
          this.removeOrder(order);
          this.warning = `Trying to sell ${order.holding.symbol} position that doesn\'t exists`;
        };

        this.daytradeService.sendSell(order, resolve, reject, handleNotFound);
      } else {
        console.log('stop loss sent', order.holding, order.quantity, order.price, moment().format('hh:mm'));
        this.incrementSell(order);
      }
    }
    return order;
  }

  buildOrder(band: any[], quotes, timestamps, idx) {
    if (band.length !== 3) {
      return null;
    }

    const specialOrder = this.processSpecialRules(quotes.low[idx], quotes.close[idx], quotes.high[idx], timestamps[idx]);

    if (specialOrder) {
      return specialOrder;
    }

    if (this.firstFormGroup.value.orderType.toLowerCase() === 'buy') {
      const orderQuantity = this.daytradeService.getOrderQuantity(this.firstFormGroup.value.quantity,
        this.firstFormGroup.value.orderSize,
        this.buyCount);

      if (orderQuantity <= 0) {
        return null;
      }

      const buyOrder = this.buildBuyOrder(orderQuantity,
        band,
        quotes.low[idx],
        timestamps[idx],
        quotes.low[idx],
        quotes);

      return this.sendBuy(buyOrder);
    } else if (this.firstFormGroup.value.orderType.toLowerCase() === 'sell') {
      const orderQuantity = this.daytradeService.getOrderQuantity(this.firstFormGroup.value.quantity,
        this.firstFormGroup.value.orderSize,
        this.sellCount);

      if (orderQuantity <= 0) {
        return null;
      }

      const sellOrder = this.buildSellOrder(orderQuantity,
        band,
        quotes.high[idx],
        timestamps[idx],
        quotes.high[idx],
        quotes);

      return this.sendSell(sellOrder);
    } else if (this.firstFormGroup.value.orderType.toLowerCase() === 'daytrade') {
      if (this.hasReachedOrderLimit()) {
        this.stop();
        return null;
      }

      const buyQuantity = this.daytradeService.getOrderQuantity(this.firstFormGroup.value.quantity,
        this.firstFormGroup.value.orderSize,
        this.buyCount);

      const sellQuantity = this.firstFormGroup.value.orderSize <= this.positionCount ?
        this.firstFormGroup.value.orderSize : this.positionCount;

      const buy: SmartOrder = buyQuantity <= 0 ? null :
        this.buildBuyOrder(buyQuantity, band, quotes.low[idx], timestamps[idx], quotes.low[idx], quotes);

      const sell: SmartOrder = sellQuantity <= 0 ? null :
        this.buildSellOrder(sellQuantity, band, quotes.high[idx], timestamps[idx], quotes.high[idx], quotes);

      if (sell && this.buyCount >= this.sellCount) {
        return this.sendSell(sell);
      } if (buy) {
        return this.sendBuy(buy);
      } else {
        return null;
      }
    }
  }

  buildBuyOrder(orderQuantity: number, band: any[], price, signalTime, signalPrice, quotes) {
    const upper = band[2],
      mid = band[1],
      lower = band[0];

    const gains = this.getPercentChange(signalPrice, this.estimateAverageBuyOrderPrice());

    if (gains <= this.firstFormGroup.value.lossThreshold) {
      this.warning = `Loss threshold met. Buying is stalled. Estimated loss: ${this.convertToFixedNumber(gains) * 100}%`;
      return null;
    }

    if (orderQuantity <= 0) {
      return null;
    }

    if (lower.length === 0) {
      return null;
    }

    if (!signalPrice || !price) {
      return null;
    }

    console.log(moment.unix(signalTime).format('hh:mm'), ' Buy ', orderQuantity, ' of ', this.order.holding.symbol,
      ' @ ', price, '\t',
      signalPrice, band);

    if (signalPrice <= lower[0]) {
      return this.daytradeService.createOrder(this.order.holding, 'Buy', orderQuantity, price, signalTime);
    }

    return null;
  }

  buildSellOrder(orderQuantity: number, band: any[], price, signalTime, signalPrice, quotes) {
    const upper = band[2],
      mid = band[1],
      lower = band[0];

    if (orderQuantity <= 0) {
      return null;
    }

    if (upper.length === 0) {
      return null;
    }

    if (!signalPrice || !price) {
      return null;
    }

    console.log(moment.unix(signalTime).format('hh:mm'), ' Sell ', orderQuantity, ' of ', this.order.holding.symbol,
      ' @ ', price, '\t',
      signalPrice, band);

    if (signalPrice >= upper[0]) {
      return this.daytradeService.createOrder(this.order.holding, 'Sell', orderQuantity, price, signalTime);
    }

    return null;
  }

  processSpecialRules(lowerPrice, closePrice, upperPrice, signalTime) {
    if (this.positionCount > 0) {
      const estimatedPrice = this.estimateAverageBuyOrderPrice();
      const gains = this.getPercentChange(closePrice, estimatedPrice);

      if (this.config.StopLoss) {
        if (gains < this.firstFormGroup.value.lossThreshold) {
          console.log('STOP LOSS TRIGGERED');
          this.warning = `Loss threshold met. Sending stop loss order. Estimated loss: ${this.convertToFixedNumber(gains)}%`;
          const stopLossOrder = this.daytradeService.createOrder(this.order.holding, 'Sell', this.positionCount, closePrice, signalTime);
          return this.sendStopLoss(stopLossOrder);
        }
      }

      if (this.config.TakeProfit) {
        if (gains >= this.firstFormGroup.value.profitThreshold) {
          console.log('PROFIT HARVEST TRIGGERED');
          this.warning = `Profits met. Realizing profits. Estimated gain: ${this.convertToFixedNumber(gains)}%`;
          const sellOrder = this.daytradeService.createOrder(this.order.holding, 'Sell', this.positionCount, upperPrice, signalTime);
          return this.sendSell(sellOrder);
        }
      }
    }
    return null;
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

  estimateAverageBuyOrderPrice(): number {
    if (this.positionCount === 0) {
      return 0;
    }

    const averagePrice = this.orders.reduce(({ count, sum }, value) => {
      if (value.side === 'Buy') {
        return { count: count + value.quantity, sum: sum + (value.price * value.quantity) };
      } else if (value.side === 'Sell') {
        return { count: count - value.quantity, sum: sum - (value.price * value.quantity) };
      }
    }, { count: 0, sum: 0 });

    return Number((averagePrice.sum / averagePrice.count).toFixed(2));
  }

  convertToFixedNumber(num) {
    return Number(num.toFixed(2));
  }

  getPercentChange(currentPrice, boughtPrice) {
    if (boughtPrice === 0 || currentPrice === boughtPrice) {
      return 0;
    } else {
      return ((currentPrice / boughtPrice) - 1);
    }
  }

  hasReachedOrderLimit() {
    return (this.buyCount >= this.firstFormGroup.value.quantity) &&
      (this.sellCount >= this.firstFormGroup.value.quantity);
  }

  ngOnDestroy() {
    stop();
  }
}
