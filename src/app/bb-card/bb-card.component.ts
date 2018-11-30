import { Component, OnChanges, Input, OnInit, ViewChild, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import 'rxjs/add/observable/concat';
import 'rxjs/add/observable/defer';
import 'rxjs/add/observable/merge';
import 'rxjs/add/observable/of';
import 'rxjs/add/operator/concatMap';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/takeWhile';

import { Chart } from 'angular-highcharts';
import { DataPoint } from 'highcharts';
import * as Highcharts from 'highcharts';

import * as moment from 'moment';
import * as _ from 'lodash';

import { OrderPref } from '../shared/enums/order-pref.enum';
import {
  BacktestService,
  DaytradeService,
  ReportingService,
  ScoreKeeperService
} from '../shared';
import { TimerObservable } from 'rxjs/observable/TimerObservable';
import { SmartOrder } from '../shared/models/smart-order';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { Subscription } from 'rxjs/Subscription';

@Component({
  selector: 'app-bb-card',
  templateUrl: './bb-card.component.html',
  styleUrls: ['./bb-card.component.css']
})
export class BbCardComponent implements OnInit, OnChanges {
  @ViewChild('stepper') stepper;
  @Input() order: SmartOrder;
  @Input() triggered: boolean;
  @Input() triggeredBacktest: boolean;
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
  bbandPeriod;
  dataInterval;
  myPreferences;
  startTime;
  endTime;
  backtestQuotes;
  momentum;
  stopped;

  constructor(private _formBuilder: FormBuilder,
    private backtestService: BacktestService,
    private daytradeService: DaytradeService,
    private reportingService: ReportingService,
    private scoringService: ScoreKeeperService,
    public dialog: MatDialog) { }

  ngOnInit() {
    this.alive = true;
    this.interval = 248880;
    this.live = false;
    this.sides = ['Buy', 'Sell', 'DayTrade'];
    this.error = '';
    this.backtestLive = false;
    this.preferenceList = [OrderPref.TakeProfit, OrderPref.StopLoss, OrderPref.MeanReversion1];
    Highcharts.setOptions({
      global: {
        useUTC: false
      }
    });
    this.startTime = moment('10:10am', 'h:mma');
    this.endTime = moment('3:30pm', 'h:mma');
    this.showGraph = false;
    this.bbandPeriod = 80;
    this.dataInterval = '1min';

    this.firstFormGroup = this._formBuilder.group({
      quantity: [this.order.quantity, Validators.required],
      lossThreshold: [this.order.lossThreshold || -0.03, Validators.required],
      profitTarget: [{ value: this.order.profitTarget || 0.03, disabled: false }, Validators.required],
      orderSize: [this.order.orderSize || this.daytradeService.getDefaultOrderSize(this.order.quantity), Validators.required],
      orderType: [this.order.side, Validators.required],
      preferences: []
    });

    this.myPreferences = this.initPreferences();

    this.secondFormGroup = this._formBuilder.group({
      secondCtrl: ['', Validators.required]
    });

    this.setup();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (_.get(changes, 'triggered.currentValue')) {
      this.goLive();
    } else if (_.get(changes, 'triggeredBacktest.currentValue')) {
      this.requestQuotes()
        .then((quotes) => {
          this.newRun(false, false);
        });
    }
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

  backtest(): void {
    this.requestQuotes()
      .then(() => {
        this.newRun(false, false);
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

  newRun(live, backtestLive) {
    this.setup();
    this.play(live, backtestLive);
  }

  requestQuotes() {
    return this.backtestService.getYahooIntraday(this.order.holding.symbol).toPromise()
      .then((result) => {
        this.backtestQuotes = result;
      });
  }

  async play(live, backtestLive) {
    this.live = live;
    this.backtestLive = backtestLive;

    let data;

    if (live) {
      const requestBody = {
        symbol: this.order.holding.symbol,
        interval: this.dataInterval
      };

      const yahooRequestBody = {
        tickers: [this.order.holding.symbol]
      };

      data = await this.backtestService.getIntraday2(requestBody).toPromise()
        .then((intraday) => {
          const timestamps = intraday.chart.result[0].timestamp;
          const lastDate = moment.unix(timestamps[timestamps.length - 1]);
          if (moment().diff(lastDate, 'minutes') > 1) {
            this.reportingService.addAuditLog(this.order.holding.symbol,
              `Quote for ${this.order.holding.name} is outdated. Last: ${lastDate.format()}, Current:${moment().format()}`);

            return this.backtestService.getPrices(yahooRequestBody)
              .toPromise()
              .then((quote) => {
                return this.daytradeService.addYahooData(intraday, quote);
              });
            // return this.backtestService.getPrice(requestBody)
            // .toPromise()
            // .then((quote) => {
            //   return this.daytradeService.addChartData(intraday, quote);
            // });
          } else {
            return intraday;
          }
        });
    } else if (this.backtestQuotes.length) {
      data = this.daytradeService.createNewChart();

      _.forEach(this.backtestQuotes, (historicalData) => {
        data = this.daytradeService.addChartData(data, historicalData);
      });
    }

    const dataFound: boolean = _.has(data, 'chart.result[0].timestamp');

    if (dataFound) {
      const volume = [],
        timestamps = _.get(data, 'chart.result[0].timestamp'),
        dataLength = timestamps.length,
        quotes = _.get(data, 'chart.result[0].indicators.quote[0]');

      if (this.live) {
        if (dataLength > this.bbandPeriod) {
          const lastIndex = dataLength - 1;
          const firstIndex = dataLength - this.bbandPeriod;
          this.runStrategy(quotes, timestamps, firstIndex, lastIndex);
        }
      }

      this.chart = this.initPriceChart(this.order.holding.symbol, this.order.holding.name);

      for (let i = 0; i < dataLength; i += 1) {
        const closePrice = quotes.close[i];

        const point: DataPoint = {};

        point.x = moment.unix(timestamps[i]).valueOf(); // the date
        point.y = closePrice; // close

        if (!this.live && i > this.bbandPeriod && !this.stopped) {
          const lastIndex = i;
          const firstIndex = i - this.bbandPeriod;
          const order = await this.runStrategy(quotes, timestamps, firstIndex, lastIndex);

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

      this.tiles = this.daytradeService.buildTileList(this.orders);
      this.volumeChart = this.initVolumeChart('Volume', volume);
    }

    // TODO: Use moment timezones
    if (moment().isAfter(this.endTime)) {
      this.reportingService.addAuditLog(this.order.holding.symbol, `Final Orders ${this.order.holding.name}`);

      _.forEach(this.tiles, (tile) => {
        _.forEach(tile.orders, (order) => {
          const orderStr = JSON.stringify(order);
          console.log(`Order: ${orderStr}`);
          // this.reportingService.addAuditLog(`Order: ${orderStr}`);
        });
      });

      this.stop();
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
    this.stopped = true;
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
      const log = `ORDER SENT ${moment(buyOrder.signalTime).format('hh:mm')}
        ${buyOrder.side} ${buyOrder.holding.symbol} ${buyOrder.quantity} ${buyOrder.price}`;

      if (this.backtestLive || this.live) {
        const resolve = (response) => {
          this.incrementBuy(buyOrder);

          console.log(`${moment().format('hh:mm')} ${log}`);
          this.reportingService.addAuditLog(this.order.holding.symbol, log);
        };

        const reject = (error) => {
          this.error = error._body;
          if (error.status !== 400) {
            this.stop();
          }
        };
        this.daytradeService.sendBuy(buyOrder, resolve, reject);
      } else {
        this.incrementBuy(buyOrder);
        console.log(`${moment().format('hh:mm')} ${log}`);
        this.reportingService.addAuditLog(this.order.holding.symbol, log);
      }
    }
    return buyOrder;
  }

  sendSell(sellOrder: SmartOrder) {
    if (sellOrder) {
      const log = `ORDER SENT ${sellOrder.side} ${sellOrder.holding.symbol} ${sellOrder.quantity} ${sellOrder.price}`;
      if (this.backtestLive || this.live) {
        const resolve = (response) => {
          this.incrementSell(sellOrder);

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
          this.removeOrder(sellOrder);
          this.setWarning(`Trying to sell ${sellOrder.holding.symbol} position that doesn\'t exists`);
        };

        this.daytradeService.sendSell(sellOrder, 'limit', resolve, reject, handleNotFound);

      } else {
        this.incrementSell(sellOrder);

        const pl = this.daytradeService.estimateSellProfitLoss(this.orders);
        this.scoringService.addProfitLoss(this.order.holding.symbol, pl);

        console.log(`${moment().format('hh:mm')} ${log}`);
        this.reportingService.addAuditLog(this.order.holding.symbol, log);
      }
    }
    return sellOrder;
  }

  sendStopLoss(order: SmartOrder) {
    if (order) {
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
    }
    return order;
  }

  buildOrder(quotes,
    timestamps,
    idx,
    band: any[],
    shortSma: any[],
    roc: any[],
    roc5: any[]) {
    if (band.length !== 3) {
      return null;
    }

    const specialOrder = this.processSpecialRules(quotes.close[idx], timestamps[idx], quotes, idx);

    if (specialOrder) {
      return specialOrder;
    }

    if (this.firstFormGroup.value.orderType.toLowerCase() === 'buy') {
      const orderQuantity = this.daytradeService.getBuyOrderQuantity(this.firstFormGroup.value.quantity,
        this.firstFormGroup.value.orderSize,
        this.buyCount,
        this.positionCount);

      if (orderQuantity <= 0) {
        return null;
      }

      const buyOrder = this.buildBuyOrder(orderQuantity,
        quotes.close[idx],
        timestamps[idx],
        quotes.low[idx] || quotes.close[idx],
        quotes,
        idx,
        band,
        shortSma,
        roc);

      return this.sendBuy(buyOrder);
    } else if (this.firstFormGroup.value.orderType.toLowerCase() === 'sell') {
      const orderQuantity = this.daytradeService.getOrderQuantity(this.firstFormGroup.value.quantity,
        this.firstFormGroup.value.orderSize,
        this.sellCount);

      if (orderQuantity <= 0) {
        return null;
      }

      const sellOrder = this.buildSellOrder(orderQuantity,
        quotes.close[idx],
        timestamps[idx],
        quotes.high[idx] || quotes.close[idx],
        quotes,
        idx,
        band,
        shortSma,
        roc5);

      return this.sendSell(sellOrder);
    } else if (this.firstFormGroup.value.orderType.toLowerCase() === 'daytrade') {
      if (this.hasReachedDayTradeOrderLimit()) {
        this.stop();
        return null;
      }
      const sellQuantity: number = this.firstFormGroup.value.orderSize <= this.positionCount ?
        this.firstFormGroup.value.orderSize : this.positionCount;

      const sell: SmartOrder = sellQuantity <= 0 ? null :
        this.buildSellOrder(sellQuantity,
          quotes.close[idx],
          timestamps[idx],
          quotes.high[idx] || quotes.close[idx],
          quotes,
          idx,
          band,
          shortSma,
          roc5);

      if (sell && this.buyCount >= this.sellCount) {
        return this.sendSell(sell);
      }

      const buyQuantity: number = this.daytradeService.getBuyOrderQuantity(this.firstFormGroup.value.quantity,
        this.firstFormGroup.value.orderSize,
        this.buyCount,
        this.positionCount);

      const buy: SmartOrder = buyQuantity <= 0 ? null :
        this.buildBuyOrder(buyQuantity, quotes.close[idx], timestamps[idx],
          quotes.low[idx] || quotes.close[idx], quotes, idx, band, shortSma, roc);

      if (buy) {
        return this.sendBuy(buy);
      }

      return null;
    }
  }

  buildBuyOrder(orderQuantity: number, price, signalTime, signalPrice, quotes, idx: number, band: any[], shortSma: any[], roc: any[]) {
    const upper = band[2],
      mid = band[1],
      lower = band[0];

    const pricePaid = this.daytradeService.estimateAverageBuyOrderPrice(this.orders);
    const gains = this.daytradeService.getPercentChange(signalPrice, pricePaid);

    if (gains < this.firstFormGroup.value.lossThreshold) {
      this.setWarning('Loss threshold met. Buying is stalled. Estimated loss: ' +
        `${this.daytradeService.convertToFixedNumber(gains, 4) * 100}%`);
      this.reportingService.addAuditLog(this.order.holding.symbol,
        `Loss circuit breaker triggered. Current: ${signalPrice}, Paid: ${pricePaid}, Gains: ${gains}`);
      return null;
    }

    if (orderQuantity <= 0) {
      return null;
    }

    if (!signalPrice || !price) {
      return null;
    }

    if (this.config.MeanReversion1) {
      if (signalPrice < lower[0]) {
        return this.daytradeService.createOrder(this.order.holding, 'Buy', orderQuantity, price, signalTime);
      }
    } else {

      const rocLen = roc[0].length - 1;
      const roc1 = _.round(roc[0][rocLen], 3);
      let num, den;
      if (this.momentum > roc1) {
        num = this.momentum;
        den = roc1;
      } else {
        den = this.momentum;
        num = roc1;
      }

      const momentumDiff = _.round(_.divide(num, den), 3);
      // console.log(`start: ${this.order.holding.symbol}
      //   ${moment.unix(signalTime).format()}, roc: ${roc1}, momentum: ${this.momentum} diff: ${momentumDiff}`);

      if (momentumDiff < -1.5 || momentumDiff > 1.5) {
        // console.log(`ma: ${moment.unix(signalTime).format()}, roc: ${roc1}, momentum: ${this.momentum} diff: ${momentumDiff}`);
        const shortSmaLen = shortSma[0].length - 1;
        const short = shortSma[0][shortSmaLen];
        const diff = _.round(this.daytradeService.calculatePercentDifference(mid[0], short), 1);

        if (diff === 0) {
          if (roc1 > 0.001) {
            const log = `MA Crossover Event - time: ${moment.unix(signalTime).format()},
            price: ${signalPrice}, roc: ${roc1}, long: ${mid[0]}, short: ${short}`;

            this.reportingService.addAuditLog(this.order.holding.symbol, log);

            console.log(log);

            return this.daytradeService.createOrder(this.order.holding, 'Buy', orderQuantity, price, signalTime);
          }
        }
      } else if (momentumDiff < 0) {
        if (signalPrice < lower[0]) {
          const log = `BB Event - time: ${moment.unix(signalTime).format()},
            price: ${signalPrice}, roc: ${roc1}, mid: ${mid[0]}, lower: ${lower[0]}`;
          this.reportingService.addAuditLog(this.order.holding.symbol, log);

          console.log(log);

          return this.daytradeService.createOrder(this.order.holding, 'Buy', orderQuantity, price, signalTime);
        }
      }
    }
    return null;
  }

  buildSellOrder(orderQuantity: number, price, signalTime, signalPrice, quotes, idx: number, band: any[], shortSma: any[], roc: any[]) {
    const upper = band[2],
      mid = band[1],
      lower = band[0];

    if (orderQuantity <= 0) {
      return null;
    }

    if (!signalPrice || !price) {
      return null;
    }

    if (this.config.MeanReversion1) {
      if (signalPrice >= upper[0]) {
        return this.daytradeService.createOrder(this.order.holding, 'Sell', orderQuantity, price, signalTime);
      }
    } else {
      const rocLen = roc[0].length - 1;
      const roc1 = _.round(roc[0][rocLen], 3);

      if (this.momentum > 0.001 || this.momentum < -0.001) {
        // console.log(`momentum neg sell - time: ${moment.unix(signalTime).format()},
        // price: ${signalPrice}, roc: ${roc1}, momentum: ${this.momentum}, lower: ${lower[0]}, diff: ${momentumDiff}`);

        if (signalPrice > upper[0]) {
          const log = `BB Sell Event - time: ${moment.unix(signalTime).format()},
            price: ${signalPrice}, roc: ${roc1}, mid: ${mid[0]}, lower: ${lower[0]}`;
          this.reportingService.addAuditLog(this.order.holding.symbol, log);

          console.log(log);

          return this.daytradeService.createOrder(this.order.holding, 'Buy', orderQuantity, price, signalTime);
        } else if (roc1 < -0.001) {
          const log = `MA Crossover Sell Event - time: ${moment.unix(signalTime).format()},
          price: ${signalPrice}, roc: ${roc1}`;

          this.reportingService.addAuditLog(this.order.holding.symbol, log);

          return this.daytradeService.createOrder(this.order.holding, 'Sell', orderQuantity, price, signalTime);
        }
      }
    }

    return null;
  }

  processSpecialRules(closePrice: number, signalTime, quotes, idx) {
    const score = this.scoringService.getScore(this.order.holding.symbol);
    if (score && score.total > 2) {
      const scorePct = _.round(_.divide(score.wins, score.total), 2);
      if (scorePct < 0.45) {
        this.stop();
        const msg = 'Too many losses. Halting trading in Wins:' +
          `${this.order.holding.symbol} ${score.wins} Loss: ${score.losses}`;

        this.reportingService.addAuditLog(this.order.holding.symbol, msg);
        console.log(msg);
      }
    }
    if (this.positionCount > 0 && closePrice) {
      const estimatedPrice = this.daytradeService.estimateAverageBuyOrderPrice(this.orders);
      const gains = this.daytradeService.getPercentChange(closePrice, estimatedPrice);

      if (this.config.StopLoss) {
        if (gains < this.firstFormGroup.value.lossThreshold) {
          this.setWarning('Loss threshold met. Sending stop loss order. Estimated loss: ' +
            `${this.daytradeService.convertToFixedNumber(gains, 4) * 100}%`);
          const log = `${this.order.holding.symbol} Stop Loss triggered: ${closePrice}/${estimatedPrice}`
          this.reportingService.addAuditLog(this.order.holding.symbol, log);
          console.log(log);
          const stopLossOrder = this.daytradeService.createOrder(this.order.holding, 'Sell', this.positionCount, closePrice, signalTime);
          return this.sendStopLoss(stopLossOrder);
        }
      }

      if (this.config.TakeProfit) {
        if (gains > this.firstFormGroup.value.profitTarget) {
          this.setWarning(`Profits met. Realizing profits. Estimated gain: ${this.daytradeService.convertToFixedNumber(gains, 4) * 100}%`);
          this.reportingService.addAuditLog(this.order.holding.symbol,
            `${this.order.holding.symbol} PROFIT HARVEST TRIGGERED: ${closePrice}/${estimatedPrice}`);
          const sellOrder = this.daytradeService.createOrder(this.order.holding, 'Sell', this.positionCount, closePrice, signalTime);
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

  async runStrategy(quotes, timestamps, firstIdx, lastIdx) {
    const { firstIndex, lastIndex } = this.daytradeService.findMostCurrentQuoteIndex(quotes.close, firstIdx, lastIdx);
    const reals = quotes.close.slice(firstIndex, lastIndex + 1);
    if (!quotes.close[lastIndex]) {
      const log = `Quote data is missing ${reals.toString()}`;
      this.reportingService.addAuditLog(this.order.holding.symbol, log);
      return null;
    }
    const band = await this.daytradeService.getBBand(reals, this.bbandPeriod);
    const shortSma = await this.daytradeService.getSMA(reals, 5);
    const roc = await this.daytradeService.getROC(_.slice(reals, reals.length - 11), 10);
    this.momentum = await this.daytradeService.getROC(reals, 70)
      .then((result) => {
        const rocLen = result[0].length - 1;
        const roc1 = _.round(result[0][rocLen], 3);
        return _.round(roc1, 3);
      });

    const roc5 = this.positionCount > 0 ? await this.daytradeService.getROC(_.slice(reals, reals.length - 6), 5) : [];

    return this.buildOrder(quotes, timestamps, lastIndex, band, shortSma, roc, roc5);
  }

  hasReachedDayTradeOrderLimit() {
    return (this.buyCount >= this.firstFormGroup.value.quantity) &&
      (this.sellCount >= this.firstFormGroup.value.quantity);
  }

  setWarning(message) {
    this.warning = message;
    this.reportingService.addAuditLog(this.order.holding.symbol, `${this.order.holding.symbol} - ${message}`);
  }

  initPreferences() {
    const pref = [];
    if (this.order.useTakeProfit) {
      pref.push(OrderPref.TakeProfit);
    }

    if (this.order.useStopLoss) {
      pref.push(OrderPref.StopLoss);
    }

    if (this.order.meanReversion1) {
      pref.push(OrderPref.MeanReversion1);
    }

    return pref;
  }
}
