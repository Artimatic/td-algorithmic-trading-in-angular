import { Component, OnChanges, Input, OnInit, ViewChild, SimpleChanges, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material';
import 'rxjs/add/operator/takeWhile';

import { Chart } from 'angular-highcharts';

import * as Highcharts from 'highcharts';
import * as moment from 'moment-timezone';
import * as _ from 'lodash';

import { OrderPref } from '../shared/enums/order-pref.enum';
import {
  BacktestService,
  DaytradeService,
  ReportingService,
  ScoreKeeperService,
  PortfolioService,
  MachineLearningService
} from '../shared';
import { SmartOrder } from '../shared/models/smart-order';
import { Subscription } from 'rxjs/Subscription';
import { IndicatorsService } from '../shared/services/indicators.service';
import { CartService } from '../shared/services/cart.service';
import { Indicators } from '../shared/models/indicators';
import { CardOptions } from '../shared/models/card-options';
import { Point } from 'angular-highcharts/lib/chart';
import { GlobalSettingsService } from '../settings/global-settings.service';
import { TradeService, AlgoQueueItem } from '../shared/services/trade.service';
import { OrderingService } from '@shared/services/ordering.service';
import { GlobalTaskQueueService } from '@shared/services/global-task-queue.service';
import { SelectItem } from 'primeng/components/common/selectitem';
import { ClientSmsService } from '@shared/services/client-sms.service';

@Component({
  selector: 'app-bb-card',
  templateUrl: './bb-card.component.html',
  styleUrls: ['./bb-card.component.css']
})
export class BbCardComponent implements OnInit, OnChanges, OnDestroy {
  @ViewChild('stepper', { static: false }) stepper;
  @Input() order: SmartOrder;
  @Input() tearDown: boolean;
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
  lastPrice: number;
  preferenceList: any[];
  config: CardOptions;
  showChart: boolean;
  tiles;
  bbandPeriod: number;
  dataInterval: string;
  stopped: boolean;
  isBacktest: boolean;
  indicators: Indicators;
  trailingHighPrice: number;
  preferences: FormControl;
  subscriptions: Subscription[];

  multiplierPreference: FormControl;
  multiplierList: number[];

  lastTriggeredTime: string;

  smsOptions: SelectItem[];
  smsOption;

  constructor(private _formBuilder: FormBuilder,
    private backtestService: BacktestService,
    private daytradeService: DaytradeService,
    private reportingService: ReportingService,
    private scoringService: ScoreKeeperService,
    private portfolioService: PortfolioService,
    private indicatorsService: IndicatorsService,
    public cartService: CartService,
    private globalSettingsService: GlobalSettingsService,
    private tradeService: TradeService,
    private machineLearningService: MachineLearningService,
    private orderingService: OrderingService,
    private globalTaskQueueService: GlobalTaskQueueService,
    private clientSmsService: ClientSmsService,
    public dialog: MatDialog) { }

  ngOnInit() {
    this.subscriptions = [];
    const algoQueueSub = this.tradeService.algoQueue.subscribe((item: AlgoQueueItem) => {
      if (this.order.holding.symbol === item.symbol) {
        if (item.reset) {
          this.setup();
          this.alive = true;
          this.setLive();
        } else if (item.updateOrder) {
          this.init();
        } else if (item.triggerMlBuySell) {
          if (this.lastTriggeredTime !== this.getTimeStamp()) {
            this.lastTriggeredTime = this.getTimeStamp();
            this.runMlBuySell();
          }
        } else {
          const currentTimeStamp = this.getTimeStamp();
          if (this.lastTriggeredTime !== currentTimeStamp) {
            this.lastTriggeredTime = this.getTimeStamp();
            this.step();
          }
        }
      }
    });

    this.subscriptions.push(algoQueueSub);
    this.smsOptions = [
      { label: 'No SMS', value: 'none' },
      { label: 'Only send SMS', value: 'only_sms' },
      { label: 'Send order and SMS', value: 'order_sms' }
    ];
  }

  ngOnChanges(changes: SimpleChanges) {
    if (_.get(changes, 'tearDown.currentValue')) {
      this.stop();
    } else if (_.get(changes, 'order')) {
      this.init();
    }
  }

  init() {
    this.alive = true;
    this.live = false;
    this.sides = ['Buy', 'Sell', 'DayTrade'];
    this.error = '';

    this.preferenceList = [
      OrderPref.TakeProfit,
      OrderPref.StopLoss,
      OrderPref.TrailingStopLoss,
      OrderPref.SellAtClose,
      OrderPref.MlBuySellAtClose
    ];

    Highcharts.setOptions({
      global: {
        useUTC: false
      }
    });
    this.showChart = false;
    this.bbandPeriod = 80;
    this.dataInterval = '1min';

    this.multiplierList = [
      1,
      2,
      3,
      4,
      5
    ];

    this.preferences = new FormControl();
    this.preferences.setValue(this.initPreferences());

    this.multiplierPreference = new FormControl();
    this.multiplierPreference.setValue(1);

    this.smsOption = new FormControl();
    this.smsOption.setValue('none');

    this.firstFormGroup = this._formBuilder.group({
      quantity: [this.order.quantity, Validators.required],
      lossThreshold: [this.order.lossThreshold || -0.005, Validators.required],
      trailingStop: [this.order.trailingStop || -0.002, Validators.required],
      profitTarget: [{ value: this.order.profitTarget || 0.01, disabled: false }, Validators.required],
      orderSize: [this.order.orderSize || this.daytradeService.getDefaultOrderSize(this.order.quantity), Validators.required],
      orderType: [this.order.side, Validators.required],
      phoneNumber: ['']
    });

    this.secondFormGroup = this._formBuilder.group({
      secondCtrl: ['', Validators.required]
    });

    this.setup();
  }

  getTimeStamp() {
    return new Date().getHours() + ':' + new Date().getMinutes();
  }

  resetStepper(stepper) {
    stepper.selectedIndex = 0;
    this.stop();
  }

  backtest(): void {
    this.setup();
    this.stop();

    this.isBacktest = true;

    const yahooSub = this.backtestService.getYahooIntraday(this.order.holding.symbol)
      .subscribe(
        result => {
          const postIntradaySub = this.backtestService.postIntraday(result).subscribe(
            status => {
              this.runServerSideBacktest();
            }, error => {
              this.runServerSideBacktest();
            });
          this.subscriptions.push(postIntradaySub);
        }, error => {
          this.error = `Error getting quotes for ${this.order.holding.symbol}`;
        });

    this.subscriptions.push(yahooSub);
  }

  initRun() {
    this.setup();
    this.alive = true;
    this.setLive();
  }

  step() {
    if (this.alive) {
      this.play();
    }
  }

  requestQuotes() {
    return this.backtestService.getTdIntraday(this.order.holding.symbol);
  }

  async runServerSideBacktest() {
    this.setup();
    this.stop();
    this.isBacktest = true;
    const currentDate = this.globalSettingsService.backtestDate;
    const futureDate = moment().add(1, 'days').format('YYYY-MM-DD');

    const getDaytradeBacktestSub = this.backtestService.getDaytradeBacktest(this.order.holding.symbol,
      futureDate, currentDate,
      {
        lossThreshold: this.order.lossThreshold,
        profitThreshold: this.order.profitTarget,
        minQuotes: 81
      }).subscribe(results => {
        // console.log(results);
        // _.forEach(results.indicators, indicator => {
        //   this.indicators = indicator;
        //   const daytradeType = this.firstFormGroup.value.orderType.toLowerCase();
        //   const date = moment(indicator.date).unix();

        //   if (indicator.recommendation) {
        //     this.processAnalysis(daytradeType, indicator.recommendation, indicator.close, date);
        //   } else {
        //     console.log('missing recommendation: ', indicator);
        //   }
        // });

        if (results.returns) {
          this.scoringService.resetProfitLoss(this.order.holding.symbol);
          this.scoringService.addProfitLoss(this.order.holding.symbol, results.returns * 100);
        }

        if (results.profitableTrades && results.totalTrades) {
          this.scoringService.winlossHash[this.order.holding.symbol] = {
            wins: results.profitableTrades,
            losses: null,
            total: results.totalTrades
          };
        }

        if (results.signals) {
          this.populateChart(results.signals);
        }
        this.isBacktest = false;
      },
        error => {
          this.error = error._body;
          this.isBacktest = false;
        }
      );

    this.subscriptions.push(getDaytradeBacktestSub);
    this.tiles = this.daytradeService.buildTileList(this.orders);
  }

  populateChart(indicators) {
    const volume = [];
    const points = [];
    const timestamps = [];

    indicators.forEach(quote => {
      if (quote.close) {
        const closePrice = quote.close;
        const time = moment.utc(quote.date).tz('America/New_York').valueOf();
        const point: Point = {
          y: closePrice
        };

        const vwmaDesc = quote.vwma ? `[vwma:${quote.vwma.toFixed(2)}]` : '';
        const mfiDesc = `[mfi:${quote.mfiLeft}]`;

        point.description = `${vwmaDesc}${mfiDesc}`;

        point.description += `[macd: ${quote.recommendation.macd}] `;
        point.description += `[bband: ${quote.recommendation.bband}]`;

        if (quote.recommendation.recommendation.toLowerCase() === 'buy') {
          point.marker = {
            symbol: 'triangle',
            fillColor: 'green',
            radius: 5
          };
        } else if (quote.recommendation.recommendation.toLowerCase() === 'sell') {
          point.marker = {
            symbol: 'triangle-down',
            fillColor: 'red',
            radius: 5
          };
        }

        points.push(point);
        timestamps.push(time);
        volume.push([
          moment(quote.date).valueOf(), // the date
          quote.volume // the volume
        ]);
      }
    });

    this.chart = this.initPriceChart(this.order.holding.symbol, timestamps, points);
  }

  async play() {
    this.setLive();

    const dataSub = this.portfolioService.getPrice(this.order.holding.symbol).subscribe((lastQuote) => {
      this.runStrategy(1 * lastQuote);
    });

    this.subscriptions.push(dataSub);

    // for (let i = 0; i < dataLength; i += 1) {
    //   const closePrice = quotes.close[i];

    //   const point: Point = {
    //     x: moment.unix(timestamps[i]).valueOf(),
    //     y: closePrice
    //   };

    //   const foundOrder = this.orders.find((order) => {
    //     return point.x === order.signalTime;
    //   });

    //   if (foundOrder) {
    //     if (foundOrder.side.toLowerCase() === 'buy') {
    //       point.marker = {
    //         symbol: 'triangle',
    //         fillColor: 'green',
    //         radius: 5
    //       };
    //     } else if (foundOrder.side.toLowerCase() === 'sell') {
    //       point.marker = {
    //         symbol: 'triangle-down',
    //         fillColor: 'red',
    //         radius: 5
    //       };
    //     }
    //   }
    // }

    this.tiles = this.daytradeService.buildTileList(this.orders);
  }

  initPriceChart(title, timestamps, seriesData): Chart {
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
        },
        categories: timestamps
      },
      tooltip: {
        crosshairs: true,
        shared: true,
        formatter: function () {
          return moment(this.x).format('hh:mm') + '<br><h3>Price:</h3> ' + Number(this.y).toFixed(2) + '<br>' +
            '<h3>indicators:</h3> ' + this.points[0].point.options.description;
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
          },
          turboThreshold: 5000
        }
      },
      series: [{
        name: title,
        data: seriesData
      }]
    });
  }

  stop() {
    this.alive = false;
    this.live = false;
    this.stopped = true;
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }

  setup() {
    this.buyCount = 0;
    this.sellCount = 0;
    this.positionCount = 0;
    this.orders = [];
    this.config = this.daytradeService.parsePreferences(this.preferences.value);
    this.warning = '';
    this.stopped = false;
    this.scoringService.resetScore(this.order.holding.symbol);

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

    if (this.config.MlBuySellAtClose) {
      this.globalTaskQueueService.trainMl2(this.order.holding.symbol, undefined, undefined, 1, undefined, () => { }, () => { });
    }
  }

  incrementBuy(order) {
    this.orders.push(order);
    this.buyCount += order.quantity;
    this.positionCount += order.quantity;
    this.order.positionCount = this.positionCount;
  }

  incrementSell(order) {
    this.orders.push(order);
    this.sellCount += order.quantity;
    this.positionCount -= order.quantity;
    this.order.positionCount = this.positionCount;
  }

  sendBuy(buyOrder: SmartOrder) {
    if (buyOrder) {
      const log = `ORDER SENT ${buyOrder.side} ${buyOrder.quantity} ${buyOrder.holding.symbol}@${buyOrder.price}`;

      if (this.live && this.smsOption.value !== 'only_sms') {
        const resolve = (response) => {
          this.incrementBuy(buyOrder);

          console.log(`${moment().format('hh:mm')} ${log}`);
          this.reportingService.addAuditLog(this.order.holding.symbol, log);
        };

        const reject = (error) => {
          this.error = error._body;
          if (error.status !== 400 || error.status !== 500) {
            this.stop();
          }
        };
        this.daytradeService.sendBuy(buyOrder, 'limit', resolve, reject);
      } else {
        this.incrementBuy(buyOrder);
        console.log(`${moment(buyOrder.signalTime).format('hh:mm')} ${log}`);
        this.reportingService.addAuditLog(this.order.holding.symbol, log);
        const buySmsSub = this.clientSmsService.sendBuySms(buyOrder.holding.symbol, this.firstFormGroup.value.phoneNumber, buyOrder.price, buyOrder.quantity).subscribe();
        this.subscriptions.push(buySmsSub);
      }
    }
    return buyOrder;
  }

  sendSell(sellOrder: SmartOrder) {
    if (sellOrder) {
      const log = `ORDER SENT ${sellOrder.side} ${sellOrder.quantity} ${sellOrder.holding.symbol}@${sellOrder.price}`;
      if (this.live && this.smsOption.value !== 'only_sms') {
        this.incrementSell(sellOrder);

        const resolve = (response) => {
          if (this.order.side.toLowerCase() !== 'sell') {
            const pl = this.daytradeService.estimateSellProfitLoss(this.orders);
            this.scoringService.addProfitLoss(this.order.holding.symbol, pl);
          }

          console.log(`${moment().format('hh:mm')} ${log}`);
          this.reportingService.addAuditLog(this.order.holding.symbol, log);
        };

        const reject = (error) => {
          this.error = error._body;
        };

        const handleNotFound = () => {
          this.removeOrder(sellOrder);
          this.setWarning(`Trying to sell position that doesn\'t exists`);
        };

        this.daytradeService.sendSell(sellOrder, 'limit', resolve, reject, handleNotFound);
      } else {
        this.incrementSell(sellOrder);

        const pl = this.daytradeService.estimateSellProfitLoss(this.orders);
        if (this.order.side.toLowerCase() !== 'sell') {
          this.scoringService.addProfitLoss(this.order.holding.symbol, pl);
        }

        console.log(`${moment(sellOrder.signalTime).format('hh:mm')} ${log}`);
        this.reportingService.addAuditLog(this.order.holding.symbol, log);
        const sellSmsSub = this.clientSmsService.sendSellSms(sellOrder.holding.symbol, this.firstFormGroup.value.phoneNumber, sellOrder.price, sellOrder.quantity).subscribe();
        this.subscriptions.push(sellSmsSub);
      }
    }
    return sellOrder;
  }

  sendStopLoss(order: SmartOrder) {
    if (order) {
      const log = `MARKET ORDER SENT ${order.side} ${order.quantity} ${order.holding.symbol}@${order.price}`;
      if (this.live && this.smsOption.value !== 'only_sms') {

        const resolve = (response) => {
          this.incrementSell(order);

          if (this.order.side.toLowerCase() !== 'sell') {
            const pl = this.daytradeService.estimateSellProfitLoss(this.orders);
            this.scoringService.addProfitLoss(this.order.holding.symbol, pl);
          }

          console.log(`${moment().format('hh:mm')} ${log}`);
          this.reportingService.addAuditLog(this.order.holding.symbol, log);
        };

        const reject = (error) => {
          this.error = error._body;
          this.stop();
        };

        const handleNotFound = () => {
          this.removeOrder(order);
          this.setWarning(`Trying to sell position that doesn\'t exists`);
        };


        this.daytradeService.sendSell(order, 'market', resolve, reject, handleNotFound);
      } else {
        this.incrementSell(order);

        if (this.order.side.toLowerCase() !== 'sell') {
          const pl = this.daytradeService.estimateSellProfitLoss(this.orders);
          this.scoringService.addProfitLoss(this.order.holding.symbol, pl);
        }
        console.log(`${moment(order.signalTime).format('hh:mm')} ${log}`);
        this.reportingService.addAuditLog(this.order.holding.symbol, log);

        const sellSmsSub = this.clientSmsService.sendSellSms(order.holding.symbol, this.firstFormGroup.value.phoneNumber, order.price, order.quantity).subscribe();
        this.subscriptions.push(sellSmsSub);
      }
    }
    return order;
  }

  buildBuyOrder(orderQuantity: number,
    price,
    signalTime,
    analysis) {

    let log = '';
    if (analysis.mfi.toLowerCase() === 'bullish') {
      log += `[mfi oversold Event - time: ${moment.unix(signalTime).format()}]`;
    }

    if (analysis.bband.toLowerCase() === 'bullish') {
      log += `[Bollinger band bullish Event -` +
        `time: ${moment.unix(signalTime).format()}]`;
    }

    if (analysis.roc.toLowerCase() === 'bullish') {
      log += `[Rate of Change Crossover bullish Event -` +
        `time: ${moment.unix(signalTime).format()}}]`;
    }

    console.log(log);
    this.reportingService.addAuditLog(this.order.holding.symbol, log);
    return this.daytradeService.createOrder(this.order.holding, 'Buy', orderQuantity, price, signalTime);
  }

  buildSellOrder(orderQuantity: number, price, signalTime, analysis) {
    let log = '';
    if (analysis.mfi.toLowerCase() === 'bearish') {
      log += `[mfi overbought Event - time: ${moment.unix(signalTime).format()}]`;
    }

    if (analysis.bband.toLowerCase() === 'bearish') {
      log += `[Bollinger band bearish Event -` +
        `time: ${moment.unix(signalTime).format()}]`;
    }

    if (analysis.roc.toLowerCase() === 'bearish') {
      log += `[Rate of Change Crossover bearish Event -` +
        `time: ${moment.unix(signalTime).format()}}]`;
    }

    console.log(log);
    this.reportingService.addAuditLog(this.order.holding.symbol, log);
    return this.daytradeService.createOrder(this.order.holding, 'Sell', orderQuantity, price, signalTime);
  }

  handleStoploss(quote, timestamp): boolean {
    return this.processSpecialRules(quote, timestamp);
  }

  async processAnalysis(daytradeType, analysis, quote, timestamp) {
    const initialQuantity = this.multiplierPreference.value * this.firstFormGroup.value.quantity;

    if (daytradeType === 'buy') {
      if (this.buyCount >= initialQuantity) {
        this.stop();
      } else if ((!this.globalSettingsService.backtesting ||
        !this.isBacktest) &&
        this.scoringService.total < 0 &&
        this.scoringService.total < this.globalSettingsService.maxLoss * -1) {
        this.warning = 'Global stop loss exceeded. Buying paused.';
      } else if (analysis.recommendation.toLowerCase() === 'buy') {
        const orderQuantity = this.daytradeService.getBuyOrderQuantity(initialQuantity,
          this.firstFormGroup.value.orderSize,
          this.buyCount,
          this.positionCount);

        if (orderQuantity > 0) {
          const buyOrder = this.buildBuyOrder(orderQuantity,
            quote,
            timestamp,
            analysis);
          this.sendBuy(buyOrder);
        }

      }
    } else if (daytradeType === 'sell') {
      if (this.sellCount >= initialQuantity) {
        this.stop();
      } else if (analysis.recommendation.toLowerCase() === 'sell') {
        const orderQuantity = this.daytradeService.getOrderQuantity(initialQuantity,
          this.firstFormGroup.value.orderSize,
          this.sellCount);

        if (orderQuantity > 0) {
          const sellOrder = this.buildSellOrder(orderQuantity,
            quote,
            timestamp,
            analysis);

          this.sendSell(sellOrder);
        }
      }
    } else if (this.isDayTrading()) {
      if (this.hasReachedDayTradeOrderLimit()) {
        this.stop();
      } else if (analysis.recommendation.toLowerCase() === 'sell') {
        if (this.buyCount >= this.sellCount) {
          const orderQuantity = this.positionCount;
          if (orderQuantity > 0) {
            const sellOrder = this.buildSellOrder(orderQuantity,
              quote,
              timestamp,
              analysis);

            this.sendStopLoss(sellOrder);
          }
        }
      } else if ((!this.globalSettingsService.backtesting ||
        !this.isBacktest) &&
        this.scoringService.total < 0 &&
        this.scoringService.total < this.globalSettingsService.maxLoss * -1) {
        this.warning = 'Global stop loss exceeded. Buying paused.';
      } else if (analysis.recommendation.toLowerCase() === 'buy') {
        const log = `Received buy recommendation`;
        const report = this.reportingService.addAuditLog(this.order.holding.symbol, log);
        console.log(report);
        let orderQuantity: number = this.scoringService.determineBetSize(this.order.holding.symbol, this.daytradeService.getBuyOrderQuantity(initialQuantity,
          this.firstFormGroup.value.orderSize,
          this.buyCount,
          this.positionCount), this.positionCount, this.order.quantity);

        const modifier = await this.globalSettingsService.globalModifier();
        orderQuantity = _.round(_.multiply(modifier, orderQuantity), 0);

        const trainingSub = this.machineLearningService
          .trainPredictNext30(this.order.holding.symbol.toUpperCase(),
            moment().add({ days: 1 }).format('YYYY-MM-DD'),
            moment().subtract({ days: 1 }).format('YYYY-MM-DD'),
            0.9,
            this.globalSettingsService.daytradeAlgo
          )
          .subscribe((data: any[]) => {
            this.machineLearningService.activate(this.order.holding.symbol,
              this.globalSettingsService.daytradeAlgo)
              .subscribe((machineResult: { nextOutput: number }) => {
                const mlLog = `RNN model result: ${machineResult.nextOutput}`;
                const mlReport = this.reportingService.addAuditLog(this.order.holding.symbol, mlLog);
                console.log(mlReport);
                if (machineResult.nextOutput > 0.5) {
                  if (orderQuantity > 0) {
                    setTimeout(() => {
                      const getPriceSub = this.portfolioService.getPrice(this.order.holding.symbol)
                        .subscribe((price) => {
                          if (price > quote) {
                            const buyOrder = this.buildBuyOrder(orderQuantity,
                              price,
                              timestamp,
                              analysis);

                            this.sendBuy(buyOrder);
                          } else {
                            console.log('Current price is too low. Actual: ', price, ' Expected: ', quote);
                          }
                        });
                      this.subscriptions.push(getPriceSub);
                    }, 120000);
                  }
                }
              });
          }, error => {
          });

        this.subscriptions.push(trainingSub);
      }
    }
  }

  closeAllPositions(price: number, signalTime: number) {
    return this.daytradeService.createOrder(this.order.holding, 'Sell', this.positionCount, price, signalTime);
  }

  processSpecialRules(closePrice: number, signalTime): boolean {
    if (this.positionCount > 0 && closePrice) {
      const estimatedPrice = this.daytradeService.estimateAverageBuyOrderPrice(this.orders);

      const gains = this.daytradeService.getPercentChange(closePrice, estimatedPrice);

      if (this.config.StopLoss) {
        if (this.firstFormGroup.value.lossThreshold > gains) {
          this.setWarning('Loss threshold met. Sending stop loss order. Estimated loss: ' +
            `${this.daytradeService.convertToFixedNumber(gains, 4) * 100}%`);
          const log = `Stop Loss triggered: closing price: ${closePrice} purchase price:${estimatedPrice}`;
          this.reportingService.addAuditLog(this.order.holding.symbol, log);
          console.log(log);
          const stopLossOrder = this.daytradeService.createOrder(this.order.holding, 'Sell', this.positionCount, closePrice, signalTime);
          this.sendStopLoss(stopLossOrder);
          return true;
        }
      }

      if (this.config.TrailingStopLoss) {
        if (closePrice > this.trailingHighPrice || closePrice > estimatedPrice) {
          this.trailingHighPrice = closePrice;
        }

        const trailingChange = this.daytradeService.getPercentChange(closePrice, this.trailingHighPrice);

        if (trailingChange && -0.002 > trailingChange) {
          this.setWarning('Trailing Stop Loss triggered. Sending sell order. Estimated gain: ' +
            `${this.daytradeService.convertToFixedNumber(trailingChange, 4) * 100}`);
          const log = `Trailing Stop Loss triggered: ${closePrice}/${estimatedPrice}`;
          this.reportingService.addAuditLog(this.order.holding.symbol, log);
          console.log(log);
          const sellOrder = this.daytradeService.createOrder(this.order.holding, 'Sell', this.positionCount, closePrice, signalTime);
          this.sendSell(sellOrder);
          return true;
        }
      }

      if (this.config.TakeProfit) {
        if (gains > this.firstFormGroup.value.profitTarget) {
          const warning = `Profits met. Realizing profits. Estimated gain: ${this.daytradeService.convertToFixedNumber(gains, 4) * 100}%`;
          this.setWarning(warning);
          this.reportingService.addAuditLog(this.order.holding.symbol,
            `${this.order.holding.symbol} PROFIT HARVEST TRIGGERED: ${closePrice}/${estimatedPrice}`);
          console.log(warning);
          const sellOrder = this.daytradeService.createOrder(this.order.holding, 'Sell', this.positionCount, closePrice, signalTime);
          this.sendSell(sellOrder);
          return true;
        }
      }

      if (this.isDayTrading()) {
        if (this.order.sellAtClose && moment().isAfter(moment(this.globalSettingsService.sellAtCloseTime)) &&
          this.positionCount > 0) {
          const log = `Closing positions: ${closePrice}/${estimatedPrice}`;
          this.reportingService.addAuditLog(this.order.holding.symbol, log);
          console.log(log);
          const stopLossOrder = this.daytradeService.createOrder(this.order.holding, 'Sell', this.positionCount, closePrice, signalTime);
          this.sendStopLoss(stopLossOrder);
          return true;
        }
      }
    }

    const score = this.scoringService.getScore(this.order.holding.symbol);
    if (score && score.total > 3) {
      const scorePct = _.round(_.divide(score.wins, score.total), 2);
      if (scorePct < 0.10) {
        if (this.isBacktest) {
          console.log('Trading not halted in backtest mode.');
        } else {
          this.stop();
          const msg = 'Too many losses. Halting trading in Wins:' +
            `${this.order.holding.symbol} ${score.wins} Loss: ${score.losses}`;

          this.reportingService.addAuditLog(this.order.holding.symbol, msg);
          console.log(msg);
          return true;
        }
      }
    }
    return false;
  }

  isDayTrading(): boolean {
    return this.firstFormGroup.value.orderType.toLowerCase() === 'daytrade';
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

  async runStrategy(lastPrice: number) {
    const orderProcessed = this.handleStoploss(lastPrice, moment().valueOf());

    if (!orderProcessed) {
      const daytradeType = this.firstFormGroup.value.orderType.toLowerCase();
      const estimatedPrice = this.daytradeService.estimateAverageBuyOrderPrice(this.orders);
      const getRecommendationSub = this.backtestService.getDaytradeRecommendation(this.order.holding.symbol, lastPrice, estimatedPrice, { minQuotes: 81 }).subscribe(
        analysis => {
          this.processAnalysis(daytradeType, analysis, lastPrice, moment().valueOf());
          return null;
        },
        error => {
          this.error = 'Issue getting analysis.';
        }
      );

      this.subscriptions.push(getRecommendationSub);
    }
  }

  goLive() {
    this.initRun();
    this.step();
  }

  hasReachedDayTradeOrderLimit() {
    return (this.buyCount >= this.firstFormGroup.value.quantity) &&
      (this.sellCount >= this.firstFormGroup.value.quantity);
  }

  setWarning(message) {
    this.warning = message;
    this.reportingService.addAuditLog(this.order.holding.symbol, `${this.order.holding.symbol} - ${message}`);
  }

  initPreferences(): OrderPref[] {
    const pref = [];
    if (this.order.useTakeProfit) {
      pref.push(OrderPref.TakeProfit);
    }

    if (this.order.useStopLoss) {
      pref.push(OrderPref.StopLoss);
    }

    if (this.order.useTrailingStopLoss) {
      pref.push(OrderPref.TrailingStopLoss);
    }

    if (this.order.sellAtClose) {
      pref.push(OrderPref.SellAtClose);
    }

    return pref;
  }

  delete() {
    this.order.stopped = true;
    this.alive = false;
    this.cartService.deleteOrder(this.order);
  }

  setLive() {
    this.live = true;
    this.stepper.next();
  }

  toggleChart() {
    this.showChart = !this.showChart;
  }

  testBuy() {
    this.portfolioService.getPrice(this.order.holding.symbol)
      .toPromise()
      .then((quote) => {
        const orderQuantity = this.daytradeService.getBuyOrderQuantity(this.firstFormGroup.value.quantity,
          this.firstFormGroup.value.orderSize,
          this.buyCount,
          this.positionCount);

        const buyOrder = this.daytradeService.createOrder(this.order.holding, 'Buy', orderQuantity, 1 * quote, null);
        this.sendBuy(buyOrder);
      });
  }

  testSell() {
    this.portfolioService.getPrice(this.order.holding.symbol)
      .toPromise()
      .then((quote) => {
        const orderQuantity = this.daytradeService.getOrderQuantity(this.firstFormGroup.value.quantity,
          this.firstFormGroup.value.orderSize,
          this.sellCount);

        const sellOrder = this.daytradeService.createOrder(this.order.holding, 'Sell', orderQuantity, 1 * quote, null);

        this.sendSell(sellOrder);
      });
  }

  testSms() {
    this.clientSmsService.sendBuySms('TEST', this.firstFormGroup.value.phoneNumber, 1, 1).subscribe();
    this.clientSmsService.sendSellSms('TEST', this.firstFormGroup.value.phoneNumber, 1, 1).subscribe();
  }

  runMlBuySell() {
    if (this.config.MlBuySellAtClose) {
      const orderQuantity = this.firstFormGroup.value.quantity - this.buyCount;

      if (orderQuantity > 0) {
        this.orderingService.executeMlOrder(this.order.holding.symbol, orderQuantity);
      }
    }
  }

  ngOnDestroy() {
    this.order = null;
    this.subscriptions.forEach(sub => {
      if (sub) {
        sub.unsubscribe();
      }
    });
  }
}
