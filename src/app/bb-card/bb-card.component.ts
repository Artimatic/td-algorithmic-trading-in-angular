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
import { BacktestService, PortfolioService, AuthenticationService } from '../shared';
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
  preferences: any[];

  constructor(private _formBuilder: FormBuilder,
    private backtestService: BacktestService,
    private portfolioService: PortfolioService,
    private authenticationService: AuthenticationService,
    public dialog: MatDialog) {
    this.alive = true;
    this.interval = 300000;
    this.live = false;
    this.sides = ['Buy', 'Sell', 'DayTrade'];
    this.error = '';
    this.warning = '';
    this.backtestLive = false;
    this.preferenceList = ['test', '2'];
    this.preferences = [OrderPref.TakeProfit, OrderPref.PanicSell];
  }

  ngOnInit() {
    this.firstFormGroup = this._formBuilder.group({
      quantity: [this.order.quantity, Validators.required],
      lossThreshold: [0.01, Validators.required],
      profitThreshold: {value: '', disabled: true},
      orderSize: [this.orderSizeEstimate(), Validators.required],
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

  orderSizeEstimate() {
    return Math.ceil(this.order.quantity / 3);
  }

  async getBBand(real: any[]): Promise<any[]> {
    const body = {
      real: real,
      period: 80,
      stddev: 2
    };

    return await this.backtestService.getBBands(body).toPromise();
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
    Highcharts.setOptions({
      global: {
        useUTC: false
      }
    });

    const requestBody = {
      symbol: this.order.holding.symbol
    };

    const quoteRequestBody = {
      ticker: this.order.holding.symbol,
      interval: '2m',
      range: '5d'
    };


    const data = await this.backtestService.getIntraday(requestBody).toPromise();

    if (data.chart.result[0].timestamp) {
      const volume = [],
        timestamps = data.chart.result[0].timestamp,
        dataLength = timestamps.length,
        quotes = data.chart.result[0].indicators.quote[0];

      if (this.live) {
        if (dataLength > 80) {
          const real = quotes.close.slice(dataLength - 81, dataLength);
          const band = await this.getBBand(real);
          this.buildOrder(band, quotes, timestamps, dataLength - 1, live);
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
          const band = await this.getBBand(real);
          const order = this.buildOrder(band, quotes, timestamps, i - 1, live);
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
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }

  setup() {
    this.buyCount = 0;
    this.sellCount = 0;
    this.orders = [];

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

  getOrderQuantity(maxAllowedOrders, orderSize, existingOrders) {
    if (existingOrders >= maxAllowedOrders) {
      return 0;
    }
    if (orderSize + existingOrders > maxAllowedOrders) {
      console.log('maxAllowedOrders: ', maxAllowedOrders, existingOrders);

      return maxAllowedOrders - existingOrders;
    }

    return orderSize;
  }

  incrementBuy(order) {
    this.orders.push(order);
    this.buyCount += order.quantity;
  }

  incrementSell(order) {
    this.orders.push(order);
    this.sellCount += order.quantity;
  }

  sendBuy(buyOrder: SmartOrder) {
    if (buyOrder) {
      if (this.backtestLive || this.live) {
        this.incrementBuy(buyOrder);
        this.authenticationService.getPortfolioAccount().subscribe(account => {
          this.portfolioService.getPortfolio()
            .subscribe(result => {
              const foundPosition = result.find((pos) => {
                return pos.instrument === this.order.holding.instrument;
              });
              console.log('Found position: ', foundPosition);

              if (foundPosition) {
                const gains = this.getPercentChange(buyOrder.price, foundPosition.average_buy_price);

                if (gains > (this.firstFormGroup.value.lossThreshold * (-1))) {
                  this.warning = '';
                } else {
                  this.warning = `Loss threshold met. Buying is stalled. Estimated loss: ${gains}%`;
                  return null;
                }
              }
              this.warning = '';
              this.portfolioService.buy(buyOrder.holding, buyOrder.quantity, buyOrder.price).subscribe(
                response => {
                  console.log('BUY SENT', moment().format('hh:mm'));
                },
                error => {
                  this.error = error.message;
                  this.stop();
                });
            });
        });
      } else {
        console.log('BUY SENT', moment().format('hh:mm'));
        this.incrementBuy(buyOrder);
      }
    }
    return buyOrder;
  }

  sendSell(sell: SmartOrder) {
    if (sell) {
      if (this.backtestLive || this.live) {
        this.incrementSell(sell);
        this.authenticationService.getPortfolioAccount().subscribe(account => {
          this.portfolioService.getPortfolio()
            .subscribe(result => {
              const foundPosition = result.find((pos) => {
                return pos.instrument === this.order.holding.instrument;
              });
              console.log('Found position: ', foundPosition);

              if (foundPosition) {
                sell.quantity = sell.quantity < foundPosition.quantity ? sell.quantity : foundPosition.quantity;
                this.portfolioService.sell(sell.holding, sell.quantity, sell.price).subscribe(
                  response => {
                    console.log('SELL SENT', moment().format('hh:mm'));
                  },
                  error => {
                    this.error = error.message;
                    this.stop();
                  });
              } else {
                this.warning = `Trying to sell ${sell.holding.symbol} position that doesn\'t exists`;
              }
            });
        });
      } else {
        console.log('SELL SENT', moment().format('hh:mm'));
        this.incrementSell(sell);
      }
    }
    return sell;
  }

  buildOrder(band: any[], quotes, timestamps, i, live: boolean) {
    if (band.length !== 3) {
      return null;
    }

    if (this.firstFormGroup.value.orderType.toLowerCase() === 'buy') {
      const orderQuantity = this.getOrderQuantity(this.firstFormGroup.value.quantity,
        this.firstFormGroup.value.orderSize,
        this.buyCount);

      if (orderQuantity <= 0) {
        this.stop();
        return null;
      }

      const buyOrder = this.buildBuyOrder(orderQuantity, band, quotes.low[i], timestamps[i], quotes.low[i], quotes, i);

      return this.sendBuy(buyOrder);
    } else if (this.firstFormGroup.value.orderType.toLowerCase() === 'sell') {
      const orderQuantity = this.getOrderQuantity(this.firstFormGroup.value.quantity,
        this.firstFormGroup.value.orderSize,
        this.sellCount);

      if (orderQuantity <= 0) {
        this.stop();
        return null;
      }

      const sellOrder = this.buildSellOrder(orderQuantity, band, quotes.high[i], timestamps[i], quotes.high[i], quotes, i);

      return this.sendSell(sellOrder);
    } else if (this.firstFormGroup.value.orderType.toLowerCase() === 'daytrade') {
      if ((this.buyCount >= this.firstFormGroup.value.quantity) &&
        (this.sellCount >= this.firstFormGroup.value.quantity)) {
        this.stop();
        return null;
      }

      const buyQuantity = this.getOrderQuantity(this.firstFormGroup.value.quantity,
        this.firstFormGroup.value.orderSize,
        this.buyCount);

      const sellQuantity = this.firstFormGroup.value.orderSize <= this.buyCount ? this.firstFormGroup.value.orderSize : this.buyCount;

      const buy: SmartOrder = buyQuantity <= 0 ? null :
        this.buildBuyOrder(buyQuantity, band, quotes.low[i], timestamps[i], quotes.low[i], quotes, i);

      const sell: SmartOrder = sellQuantity <= 0 ? null :
        this.buildSellOrder(sellQuantity, band, quotes.high[i], timestamps[i], quotes.high[i], quotes, i);

      if (sell && this.buyCount >= this.sellCount) {
        return this.sendSell(sell);
      } else if (buy) {
        return this.sendBuy(buy);
      } else {
        return null;
      }
    }
  }

  buildBuyOrder(orderQuantity: number, band: any[], price, signalTime, signalPrice, quotes, i) {
    const upper = band[2],
      mid = band[1],
      lower = band[0];

    const gains = this.getPercentChange(signalPrice, this.estimateAverageBuyOrderPrice());

    if (gains > (this.firstFormGroup.value.lossThreshold * (-1))) {
      this.warning = '';
    } else {
      this.warning = `Loss threshold met. Buying is stalled. Estimated loss: ${gains}%`;
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
      ' @ ', price, '|',
      signalPrice, i, band);

    if (signalPrice <= lower[0]) {
      const myOrder: SmartOrder = {
        holding: this.order.holding,
        quantity: orderQuantity,
        price: Number(price.toFixed(2)),
        submitted: true,
        pending: true,
        side: 'Buy',
        timeSubmitted: moment().unix(),
        signalTime: moment.unix(signalTime).valueOf()
      };
      return myOrder;
    }

    return null;
  }

  buildSellOrder(orderQuantity: number, band: any[], price, signalTime, signalPrice, quotes, i) {
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
      ' @ ', price, '|',
      signalPrice, i, band);

    if (signalPrice >= upper[0]) {
      const myOrder: SmartOrder = {
        holding: this.order.holding,
        quantity: orderQuantity,
        price: Number(price.toFixed(2)),
        submitted: false,
        pending: false,
        side: 'Sell',
        timeSubmitted: moment().unix(),
        signalTime: moment.unix(signalTime).valueOf()
      };
      return myOrder;
    }

    return null;
  }

  estimateAverageBuyOrderPrice(): number {
    if (this.buyCount === 0) {
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

  getPercentChange(currentPrice, boughtPrice) {
    if (boughtPrice === 0) {
      return 0;
    } else if (currentPrice > boughtPrice) {
      return ((currentPrice / boughtPrice) - 1);
    } else if (currentPrice < boughtPrice) {
      return (1 - (currentPrice / boughtPrice));
    } else {
      return 0;
    }
  }

  ngOnDestroy() {
    stop();
  }
}
