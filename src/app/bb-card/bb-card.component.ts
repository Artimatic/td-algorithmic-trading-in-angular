import { Component, OnDestroy, EventEmitter, Input, OnInit } from '@angular/core';
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

import { BacktestService, PortfolioService, AuthenticationService } from '../shared';
import { Order } from '../shared/models/order';
import { TimerObservable } from 'rxjs/observable/TimerObservable';
import { SmartOrder } from '../shared/models/smart-order';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-bb-card',
  templateUrl: './bb-card.component.html',
  styleUrls: ['./bb-card.component.css']
})
export class BbCardComponent implements OnDestroy, OnInit {
  @Input() order: SmartOrder;
  chart: Chart;
  volumeChart: Chart;
  display: boolean;
  alive: boolean;
  live: boolean;
  interval: number;
  orders: SmartOrder[] = [];
  buyCount: number;
  sellCount: number;
  firstFormGroup: FormGroup;
  secondFormGroup: FormGroup;
  historicalData;
  sub;
  sides;

  constructor(private _formBuilder: FormBuilder,
    private backtestService: BacktestService,
    private portfolioService: PortfolioService,
    private authenticationService: AuthenticationService,
    public dialog: MatDialog) {
    this.display = false;
    this.alive = true;
    this.interval = 300000;
    this.live = false;
    this.sides = ['Buy', 'Sell', 'DayTrade'];
    this.buyCount = 0;
    this.sellCount = 0;
  }

  ngOnInit() {
    this.firstFormGroup = this._formBuilder.group({
      quantity: [this.order.quantity, Validators.required],
      lossThreshold: [''],
      profitThreshold: [''],
      orderSize: [this.orderSizeEstimate(), Validators.required],
      orderType: [this.order.side, Validators.required]
    });
    this.secondFormGroup = this._formBuilder.group({
      secondCtrl: ['', Validators.required]
    });
  }

  progress() {
    return 100 * Math.ceil(this.orders.length / this.firstFormGroup.value.quantity);
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

  goLive() {
    this.sub = TimerObservable.create(0, this.interval)
      .takeWhile(() => this.alive)
      .subscribe(() => {
        this.live = true;
        this.play(true);
      });
  }

  async play(live) {
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
        quotes = data.chart.result[0].indicators.quote[0],
        side = this.order.side.toLowerCase();

      // if (!this.historicalData) {
      //   this.historicalData = await this.backtestService.getQuote(quoteRequestBody).toPromise();
      // }

      // this.historicalData.reduce((accumulator, currentValue) => {
      //   accumulator.timestamps.push(moment(currentValue.date).unix());
      //   accumulator.low.push(currentValue.low);
      //   accumulator.high.push(currentValue.high);
      //   accumulator.close.push(currentValue.close);
      //   accumulator.volume.push(currentValue.volume);
      //   return accumulator;
      // }, { timestamps: [], low: [], high: [], close: [], volume: [] });

      // this.historicalData.slice().reverse().forEach((currentValue) => {
      //   timestamps.unshift(moment(currentValue.date).unix());
      //   quotes.low.unshift(currentValue.low);
      //   quotes.high.unshift(currentValue.high);
      //   quotes.close.unshift(currentValue.close);
      //   quotes.volume.unshift(currentValue.volume);
      // });

      if (live) {
        if (dataLength > 80) {
          const real = quotes.close.slice(dataLength - 81, dataLength);
          const band = await this.getBBand(real);
          const newOrder = this.buildOrder(band, quotes, timestamps, dataLength - 2, live);
          if (newOrder) {
            this.orders.push(newOrder);
          }
        }
      }

      this.chart = this.initPriceChart(this.order.holding.symbol, this.order.holding.name);

      for (let i = 0; i < dataLength; i += 1) {
        const closePrice = quotes.close[i];

        const point: DataPoint = {};

        point.x = moment.unix(timestamps[i]).valueOf(); // the date
        point.y = closePrice; // close
        if (!live) {
          if (i > 80) {
            const real = quotes.close.slice(i - 81, i);
            const band = await this.getBBand(real);
            const newOrder = this.buildOrder(band, quotes, timestamps, i - 1, live);
            if (newOrder) {
              if (newOrder.side.toLowerCase() === 'buy') {
                point.marker = {
                  symbol: 'triangle',
                  fillColor: 'green',
                  radius: 5
                };
              } else if (newOrder.side.toLowerCase() === 'sell') {
                point.marker = {
                  symbol: 'triangle-down',
                  fillColor: 'red',
                  radius: 5
                };
              }
              this.orders.push(newOrder);
            }
          }
        } else {
          const foundOrder = this.orders.find((order) => {
            return point.x === order.signalTime;
          });
          if (foundOrder && foundOrder.side.toLowerCase() === 'buy') {
            point.marker = {
              symbol: 'triangle',
              fillColor: 'green',
              radius: 5
            };
          } else if (foundOrder && foundOrder.side.toLowerCase() === 'sell') {
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
          return moment(this.x).format('hh:mm') + '<br><b>Price:</b> ' + this.y + '<br>';
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

  getOrderQuantity(maxAllowedOrders, orderSize, existingOrders) {
    if (existingOrders >= maxAllowedOrders) {
      return 0;
    }

    if (orderSize + existingOrders > maxAllowedOrders) {
      return maxAllowedOrders - existingOrders;
    }
    return orderSize;
  }

  buildOrder(band: any[], quotes, timestamps, i, live: boolean) {
    if (band.length !== 3) {
      return null;
    }

    if (this.order.side.toLowerCase() === 'buy') {
      const orderQuantity = this.getOrderQuantity(this.firstFormGroup.value.quantity,
        this.firstFormGroup.value.orderSize,
        this.buyCount);

      if (orderQuantity <= 0) {
        return null;
      }

      const buyOrder = this.makeBuyOrder(orderQuantity, band, quotes.low[i], timestamps[i], quotes.close[i], quotes, i);
      if (live) {
        this.portfolioService.buy(buyOrder.holding, buyOrder.quantity, buyOrder.price).subscribe(
          response => {
            buyOrder.submitted = true;
          },
          error => {
            buyOrder.submitted = false;
          });
      }
      return buyOrder;
    } else if (this.order.side.toLowerCase() === 'sell') {
      const orderQuantity = this.getOrderQuantity(this.firstFormGroup.value.quantity,
        this.firstFormGroup.value.orderSize,
        this.sellCount);

      if (orderQuantity <= 0) {
        return null;
      }

      const sellOrder = this.makeBuyOrder(orderQuantity, band, quotes.low[i], timestamps[i], quotes.close[i], quotes, i);

      if (live) {
        this.portfolioService.sell(sellOrder.holding, sellOrder.quantity, sellOrder.price).subscribe(
          response => {
            sellOrder.submitted = true;
          },
          error => {
            sellOrder.submitted = false;
          });
      }
      return sellOrder;
    } else if (this.order.side.toLowerCase() === 'daytrade') {
      const buyQuantity = this.getOrderQuantity(this.firstFormGroup.value.quantity,
        this.firstFormGroup.value.orderSize,
        this.buyCount);

      let sellQuantity = this.firstFormGroup.value.orderSize <= this.buyCount ? this.firstFormGroup.value.orderSize : this.buyCount;

      const buy: SmartOrder = buyQuantity <= 0 ? null :
        this.makeBuyOrder(buyQuantity, band, quotes.low[i], timestamps[i], quotes.close[i], quotes, i);
      const sell: SmartOrder = sellQuantity <= 0 ? null :
        this.makeSellOrder(sellQuantity, band, quotes.high[i], timestamps[i], quotes.close[i], quotes, i);

      if (sell) {
        if (true || live) {
          this.authenticationService.getPortfolioAccount().subscribe(account => {
            this.portfolioService.getPortfolio()
              .subscribe(result => {
                const foundPosition = result.find((pos) => {
                  return pos.instrument === this.order.holding.instrument;
                });
                console.log('Found position: ', foundPosition);
                sellQuantity = sellQuantity < foundPosition.quantity ? sellQuantity : foundPosition.quantity;
                this.portfolioService.sell(sell.holding, sellQuantity, sell.price).subscribe(
                  response => {
                    sell.submitted = true;
                    this.orders.push(sell);
                  },
                  error => {
                    sell.submitted = false;
                  });
              });
          });
        }
        return sell;
      } else if (buy) {
        return buy;
      } else {
        return null;
      }
    }
  }

  makeBuyOrder(orderQuantity: number, band: any[], price, signalTime, signalPrice, quotes, i) {
    const upper = band[2],
      mid = band[1],
      lower = band[0];

    console.log('buy algo: ', i, band, price, moment.unix(signalTime).format('hh:mm'), signalPrice, orderQuantity);

    if (orderQuantity <= 0) {
      return null;
    }

    if (lower.length === 0) {
      return null;
    }

    if (!signalPrice || !price) {
      return null;
    }

    if (signalPrice <= lower[0]) {
      const myOrder: SmartOrder = {
        holding: this.order.holding,
        quantity: orderQuantity,
        price: Number(price.toFixed(2)),
        submitted: true,
        pending: true,
        side: 'Buy',
        timeSubmitted: moment().unix(),
        signalTime: signalTime
      };
      console.log('BOUGHT', moment.unix(signalTime).format('hh:mm'));
      this.buyCount++;
      return myOrder;
    }

    return null;
  }

  makeSellOrder(orderQuantity: number, band: any[], price, signalTime, signalPrice, quotes, i) {
    const upper = band[2],
      mid = band[1],
      lower = band[0];

    console.log('Sell Algo: ', i, band, price, moment.unix(signalTime).format('hh:mm'), signalPrice, orderQuantity);

    if (orderQuantity <= 0) {
      return null;
    }

    if (upper.length === 0) {
      return null;
    }

    if (!signalPrice || !price) {
      return null;
    }

    if (signalPrice >= upper[0]) {
      const myOrder: SmartOrder = {
        holding: this.order.holding,
        quantity: orderQuantity,
        price: Number(price.toFixed(2)),
        submitted: false,
        pending: false,
        side: 'Sell',
        timeSubmitted: moment().unix(),
        signalTime: signalTime
      };
      console.log('SOLD', moment.unix(signalTime).format('hh:mm'));
      this.sellCount++;
      return myOrder;
    }

    return null;
  }

  ngOnDestroy() {
    stop();
  }
}
