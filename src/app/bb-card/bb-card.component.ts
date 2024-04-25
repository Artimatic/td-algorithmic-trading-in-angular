import { Component, OnChanges, Input, OnInit, SimpleChanges, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';

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
import { OrderTypes, SmartOrder } from '../shared/models/smart-order';
import { Subscription } from 'rxjs/Subscription';
import { CartService } from '../shared/services/cart.service';
import { Indicators } from '../shared/models/indicators';
import { CardOptions } from '../shared/models/card-options';
import { GlobalSettingsService } from '../settings/global-settings.service';
import { TradeService, AlgoQueueItem } from '../shared/services/trade.service';
import { OrderingService } from '@shared/services/ordering.service';
import { GlobalTaskQueueService } from '@shared/services/global-task-queue.service';
import { ClientSmsService } from '@shared/services/client-sms.service';
import { SchedulerService } from '@shared/service/scheduler.service';
import { MachineDaytradingService } from '../machine-daytrading/machine-daytrading.service';
import { MenuItem, MessageService, SelectItem } from 'primeng/api';
import { ServiceStatus } from '@shared/models/service-status';
import { DaytradeAlgorithms } from '@shared/enums/daytrade-algorithms.enum';
import { BacktestTableComponent } from '../backtest-table/backtest-table.component';
import { DialogService } from 'primeng/dynamicdialog';
import { BacktestTableService } from '../backtest-table/backtest-table.service';

@Component({
  selector: 'app-bb-card',
  templateUrl: './bb-card.component.html',
  styleUrls: ['./bb-card.component.css']
})
export class BbCardComponent implements OnInit, OnChanges, OnDestroy {
  @Input() order: SmartOrder;
  @Input() tearDown: boolean;
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
  config: CardOptions;
  tiles;
  bbandPeriod: number;
  dataInterval: string;
  stopped: boolean;
  isBacktest: boolean;
  indicators: Indicators;
  trailingHighPrice: number;

  preferences: FormControl;
  preferenceList: any[];

  subscriptions: Subscription[];

  multiplierPreference: FormControl;
  machineControlled: FormControl;
  multiplierList: number[];

  lastTriggeredTime: string;

  smsOptions: SelectItem[];
  smsOption;

  items: MenuItem[];

  activeIndex = 0;

  priceLowerBound = null;
  priceUpperBound = null;

  selectedAlgorithm: FormControl;
  algorithmList: any[];

  currentBalance: number;

  constructor(private _formBuilder: FormBuilder,
    private backtestService: BacktestService,
    private daytradeService: DaytradeService,
    private reportingService: ReportingService,
    private scoringService: ScoreKeeperService,
    private portfolioService: PortfolioService,
    public cartService: CartService,
    private globalSettingsService: GlobalSettingsService,
    private tradeService: TradeService,
    private machineLearningService: MachineLearningService,
    private orderingService: OrderingService,
    private globalTaskQueueService: GlobalTaskQueueService,
    private clientSmsService: ClientSmsService,
    private schedulerService: SchedulerService,
    private machineDaytradingService: MachineDaytradingService,
    private messageService: MessageService,
    private scoreKeeperService: ScoreKeeperService,
    private dialogService: DialogService,
    private backtestTableService: BacktestTableService,
    public dialog: MatDialog) { }

  ngOnInit() {
    this.subscriptions = [];
    const algoQueueSub = this.tradeService.algoQueue.subscribe((item: AlgoQueueItem) => {
      if (this.order.holding.symbol === item.symbol || (this.order.id !== undefined && this.order.id === item.id) ||
        (this.machineControlled.value && this.order.id === 'MACHINE')) {
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
        } else if (this.alive) {
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

    this.items = [{
      label: 'Edit',
      command: () => {
        this.activeIndex = 0;
      }
    },
    {
      label: 'Submit',
      command: () => {
        this.activeIndex = 1;
      }
    }];
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

    this.algorithmList = [
      DaytradeAlgorithms.Default
    ];

    this.selectedAlgorithm = new FormControl();
    this.selectedAlgorithm.setValue(this.algorithmList[0]);
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
    this.machineControlled = new FormControl();
    this.multiplierPreference.setValue(1);
    this.machineControlled.setValue(false);

    this.smsOption = new FormControl();
    this.smsOption.setValue('none');

    this.firstFormGroup = this._formBuilder.group({
      quantity: [this.order.quantity, Validators.required],
      lossThreshold: [this.order.lossThreshold || -0.005, Validators.required],
      trailingStop: [this.order.trailingStop || -0.002, Validators.required],
      profitTarget: [{ value: this.order.profitTarget || 0.01, disabled: false }, Validators.required],
      orderSize: [this.order.orderSize || this.daytradeService.getDefaultOrderSize(this.order.quantity), Validators.required],
      orderType: [this.order.side, Validators.required],
      phoneNumber: [''],
      useML: false
    });

    this.secondFormGroup = this._formBuilder.group({
      secondCtrl: ['', Validators.required]
    });

    this.setup();
  }

  getTimeStamp() {
    return new Date().getHours() + ':' + new Date().getMinutes();
  }

  resetStepper() {
    this.activeIndex = 0;
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

    this.schedulerService.schedule(() => {
      this.backtestService.getDaytradeBacktest(this.order.holding.symbol,
        futureDate, currentDate,
        {
          lossThreshold: this.order.lossThreshold,
          profitThreshold: this.order.profitTarget,
          minQuotes: 81
        }).subscribe(results => {
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
          this.isBacktest = false;
        },
          error => {
            this.error = error._body;
            this.isBacktest = false;
          }
        );
    }, `${this.order.holding.symbol}_bbcard`, this.globalSettingsService.stopTime);

    this.tiles = this.daytradeService.buildTileList(this.orders);
  }

  async play() {
    this.setLive();

    if (this.machineControlled.value || this.order.id === 'MACHINE') {
      if (!this.machineDaytradingService.selectedStock) {
        this.machineDaytradingService.findTrade();
      } else {
        this.order = {
          holding: {
            symbol: this.machineDaytradingService.selectedStock,
            instrument: ''
          },
          quantity: this.machineDaytradingService.quantity,
          price: null,
          submitted: false,
          pending: false,
          side: 'DayTrade'
        };
        this.firstFormGroup.value.quantity = this.machineDaytradingService.quantity || 1;
        this.firstFormGroup.value.orderSize = this.machineDaytradingService.orderSize || 1;

        console.log('Scheduling machine order ', this.firstFormGroup.value);
        this.schedulerService.schedule(() => {

          this.backtestService.getLastPriceTiingo({ symbol: this.order.holding.symbol })
            .subscribe(tiingoQuote => {
              const lastPrice = tiingoQuote[0].last;
              this.runStrategy(1 * lastPrice);
            });
        }, 'current');
      }
    } else {
      this.schedulerService.schedule(() => {
        this.backtestService.getLastPriceTiingo({ symbol: this.order.holding.symbol })
          .subscribe(tiingoQuote => {
            const lastPrice = tiingoQuote[0].last;
            this.runStrategy(1 * lastPrice);
          });
      }, 'current');
    }

    this.tiles = this.daytradeService.buildTileList(this.orders);
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

  async sendBuy(buyOrder: SmartOrder) {
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

        if (this.order.type === OrderTypes.options && this.order.side.toLowerCase() === 'buy') {
          const bullishStrangle = await this.backtestTableService.getCallTrade(this.order.holding.symbol);
          // const price = bullishStrangle.call.bid + bullishStrangle.put.bid;
          const price = this.backtestTableService.findOptionsPrice(bullishStrangle.call.bid, bullishStrangle.call.ask) +
            this.backtestTableService.findOptionsPrice(bullishStrangle.put.bid, bullishStrangle.put.ask);
          const orderQuantity = Math.floor(this.currentBalance * (this.order?.allocation || 0.01) / price)

          console.log('orderQuantity', orderQuantity)
          console.log('built strangle', bullishStrangle);

          this.portfolioService.sendTwoLegOrder(bullishStrangle.call.symbol,
            bullishStrangle.put.symbol, 1, price, false).subscribe();
        } else {
          this.daytradeService.sendBuy(buyOrder, 'limit', resolve, reject);
        }
      } else {
        this.incrementBuy(buyOrder);
        console.log(`${moment(buyOrder.signalTime).format('hh:mm')} ${log}`);
        this.reportingService.addAuditLog(this.order.holding.symbol, log);
        this.clientSmsService.sendBuySms(buyOrder.holding.symbol, this.firstFormGroup.value.phoneNumber, buyOrder.price, buyOrder.quantity).subscribe();
      }
    }
    return buyOrder;
  }

  sendSell(sellOrder: SmartOrder) {
    if (sellOrder) {
      this.backtestService.getLastPriceTiingo({ symbol: this.order.holding.symbol })
        .subscribe(tiingoQuote => {
          const lastPrice = tiingoQuote[0].last;

          sellOrder.price = _.round(lastPrice, 2);
          const log = `ORDER SENT ${sellOrder.side} ${sellOrder.quantity} ${sellOrder.holding.symbol}@${sellOrder.price}`;
          if (this.live && this.smsOption.value !== 'only_sms') {
            this.incrementSell(sellOrder);

            const resolve = (response) => {
              if (this.order.side.toLowerCase() !== 'sell') {
                const pl = this.daytradeService.estimateSellProfitLoss(this.orders);
                console.log('Estimated sell pl', pl);
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
            this.clientSmsService.sendSellSms(sellOrder.holding.symbol, this.firstFormGroup.value.phoneNumber, sellOrder.price, sellOrder.quantity).subscribe();
          }
        });
    }
    return sellOrder;
  }

  sendStopLoss(order: SmartOrder) {
    if (order) {
      const log = `MARKET ORDER SENT ${order.side} ${order.quantity} ${order.holding.symbol}@${order.price}`;
      if (this.live && this.smsOption.value !== 'only_sms') {
        this.incrementSell(order);

        const resolve = (response) => {
          if (this.order.side.toLowerCase() !== 'sell') {
            const pl = this.daytradeService.estimateSellProfitLoss(this.orders);
            console.log('Estimated sell pl on stop loss', pl);
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

        this.clientSmsService.sendSellSms(order.holding.symbol, this.firstFormGroup.value.phoneNumber, order.price, order.quantity).subscribe();
      }
    }
    return order;
  }

  private getDisplaySignalTime(time: number) {
    return moment.unix(time).format('DD.MM.YYYY hh:mm');
  }

  createLog(
    signalTime,
    analysis) {
    let log = '';
    for (const indicator of analysis) {
      if (analysis[indicator] && (analysis[indicator] === 'bullish' || analysis[indicator] === 'bearish')) {
        log += `[${indicator} ${analysis[indicator]} Event - time: ${this.getDisplaySignalTime(signalTime)}]`;
      }
    }
    return log;
  }

  buildBuyOrder(orderQuantity: number,
    price,
    signalTime,
    analysis) {

    let log = this.createLog(signalTime, analysis);

    console.log(log);
    this.reportingService.addAuditLog(this.order.holding.symbol, log);
    return this.daytradeService.createOrder(this.order.holding, 'Buy', orderQuantity, price, signalTime);
  }

  buildSellOrder(orderQuantity: number, price, signalTime, analysis) {
    let log = this.createLog(signalTime, analysis);

    console.log(log);
    this.reportingService.addAuditLog(this.order.holding.symbol, log);
    return this.daytradeService.createOrder(this.order.holding, 'Sell', orderQuantity, price, signalTime);
  }

  handleStoploss(quote, timestamp): boolean {
    return this.processSpecialRules(quote, timestamp);
  }

  async processAnalysis(daytradeType, analysis, quote, timestamp) {
    const initialQuantity = this.multiplierPreference.value * this.firstFormGroup.value.quantity;
    if (this.hasReachedOrderLimit()) {
      this.stop();
    } else if (analysis.recommendation.toLowerCase() === 'buy') {
      if (daytradeType === 'buy' || this.isDayTrading()) {
        this.daytradeService.sellDefaultHolding();

        console.log('Received Buy recommendation: ', analysis, this.order.holding.symbol);
        this.machineDaytradingService.getPortfolioBalance().subscribe((data) => {
          this.currentBalance = data.cashBalance;
          // const availableFunds = data.availableFunds;
          const usage = (data.liquidationValue - this.currentBalance) / data.liquidationValue;

          if (usage < this.globalSettingsService.maxAccountUsage) {
            const log = `${moment().format()} Received buy recommendation`;
            const report = this.reportingService.addAuditLog(this.order.holding.symbol, log);
            console.log(report);

            let orderQuantity = this.daytradeService.getBuyOrderQuantity(initialQuantity,
              this.firstFormGroup.value.orderSize,
              this.buyCount,
              this.positionCount);
            const tradeCost = orderQuantity * quote;
            if (tradeCost > this.currentBalance) {
              orderQuantity = Math.floor((this.currentBalance * this.order.allocation) / quote) | 1;
            }
            this.schedulerService.schedule(() => {
              this.machineLearningService
                .trainDaytrade(this.order.holding.symbol.toUpperCase(),
                  moment().add({ days: 1 }).format('YYYY-MM-DD'),
                  moment().subtract({ days: 1 }).format('YYYY-MM-DD'),
                  1,
                  this.globalSettingsService.daytradeAlgo
                )
                .subscribe((data: any[]) => {
                  console.log(`${this.order.holding.symbol} ml result: `, data[0].nextOutput);
                  const mlLog = `Ml next output: ${data[0].nextOutput}`;
                  const mlReport = this.reportingService.addAuditLog(this.order.holding.symbol, mlLog);
                  console.log(mlReport);
                  if (data[0].nextOutput > 0.6) {
                    if (!this.priceLowerBound || Number(quote) <= Number(this.priceLowerBound)) {
                      this.daytradeBuy(quote, orderQuantity, timestamp, analysis);
                    } else {
                      console.log('Price too high ', Number(quote), ' vs ', Number(this.priceLowerBound));
                    }
                  } else {
                    this.priceLowerBound = quote;
                    this.messageService.add({
                      severity: 'success',
                      summary: this.order.holding.symbol,
                      detail: `Buy recommendation at ${moment().format('hh:mm')}`,
                      sticky: true
                    });
                  }
                }, error => {
                  console.log('daytrade ml error: ', error);
                  this.daytradeBuy(quote, orderQuantity, timestamp, analysis);
                });
            }, `${this.order.holding.symbol}_bbcard_ml`, this.globalSettingsService.stopTime, true);
          }
        });
      }
    } else if (analysis.recommendation.toLowerCase() === 'sell' && (daytradeType === 'sell' || this.isDayTrading())) {
      console.log('Received sell recommendation: ', analysis, this.order.holding.symbol);
      if (this.buyCount >= this.sellCount) {
        let orderQuantity = 0;
        if (this.order.allocation) {
          const data = await this.portfolioService.getTdPortfolio().toPromise();
          for (const holding of data) {
            const stock = holding.instrument.symbol;
            if (holding.instrument.assetType.toLowerCase() === 'equity' &&
              stock.toLowerCase() === this.order.holding.symbol.toLowerCase()) {
              orderQuantity = holding.longQuantity;
            }
          }
        } else {
          orderQuantity = this.positionCount ? this.positionCount : this.firstFormGroup.value.orderSize;
        }

        if (orderQuantity > 0) {
          const sellOrder = this.buildSellOrder(orderQuantity,
            quote,
            timestamp,
            analysis);

          this.schedulerService.schedule(() => {
            this.machineLearningService
              .trainDaytrade(this.order.holding.symbol.toUpperCase(),
                moment().add({ days: 1 }).format('YYYY-MM-DD'),
                moment().subtract({ days: 1 }).format('YYYY-MM-DD'),
                1,
                this.globalSettingsService.daytradeAlgo
              )
              .subscribe((data: any[]) => {
                console.log(`${this.order.holding.symbol} ml result: `, data[0].nextOutput);
                const mlLog = `Ml next output: ${data[0].nextOutput}`;
                const mlReport = this.reportingService.addAuditLog(this.order.holding.symbol, mlLog);
                console.log(mlReport);
                if (data[0].nextOutput < 0.6) {
                  this.sendStopLoss(sellOrder);
                }
              }, error => {
                console.log('daytrade ml error: ', error);
                this.sendStopLoss(sellOrder);
              });
          }, `${this.order.holding.symbol}_bbcard_ml`, this.globalSettingsService.stopTime, true);
        }
      }
    }
  }

  private daytradeBuy(quote: number, orderQuantity: number, timestamp: number, analysis) {
    if (orderQuantity > 0) {
      orderQuantity = this.scoreKeeperService.modifier(this.order.holding.symbol, orderQuantity);
      this.backtestService.getLastPriceTiingo({ symbol: this.order.holding.symbol })
        .subscribe(tiingoQuote => {
          const lastPrice = tiingoQuote[0].last;

          if (lastPrice >= quote * 1) {
            const buyOrder = this.buildBuyOrder(orderQuantity,
              _.round(lastPrice, 2),
              timestamp,
              analysis);

            this.sendBuy(buyOrder);
          } else {
            console.log(`${moment().format()} Current price is too low. Actual: ${lastPrice} Expected: ${quote}`);
          }
        }, () => {
          const buyOrder = this.buildBuyOrder(orderQuantity,
            quote,
            timestamp,
            analysis);

          this.sendBuy(buyOrder);
        });
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
          this.setWarning(`Stop loss met: ${this.firstFormGroup.value.lossThreshold} Estimated loss: ${this.daytradeService.convertToFixedNumber(gains, 4) * 100}%`);
          const log = `Stop Loss triggered. Stop loss: ${this.firstFormGroup.value.lossThreshold} closing price: ${closePrice} purchase price:${estimatedPrice}`;
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

        if (gains > 0 && trailingChange > 0 && this.getStopLossSetting() > trailingChange) {
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

      const isStagnant = this.isStagnantDaytrade(this.orders, gains);
      if (isStagnant && this.positionCount > 0) {
        const log = `Order is stagnant. Closing positions: ${closePrice}/${estimatedPrice}`;
        this.reportingService.addAuditLog(this.order.holding.symbol, log);
        console.log(log);
        const stopLossOrder = this.daytradeService.createOrder(this.order.holding, 'Sell', this.positionCount, closePrice, signalTime);
        this.sendStopLoss(stopLossOrder);
        return true;
      }

      const sellTime = moment.tz(`${moment().format('YYYY-MM-DD')} 15:30`, 'America/New_York').toDate();
      if (this.order.sellAtClose && moment().isAfter(moment(sellTime))) {
        const log = `Current time: ${moment.tz('America/New_York').format()} is after ${sellTime} Is sell at close order: ${this.order.sellAtClose} Closing positions: ${closePrice}/${estimatedPrice}`;
        this.reportingService.addAuditLog(this.order.holding.symbol, log);
        console.log(log);
        const stopLossOrder = this.daytradeService.createOrder(this.order.holding, 'Sell', this.positionCount, closePrice, signalTime);
        this.sendStopLoss(stopLossOrder);
        return true;
      }
    }

    if (this.order) {
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
    }

    return false;
  }

  private isStagnantDaytrade(currentOrders: SmartOrder[], gains: number) {
    if (this.isDayTrading() && gains < 0 && currentOrders.length > 0 && this.positionCount > 0) {
      const stagnantOrderIdx = currentOrders.findIndex((order) => {
        if (order.side.toLowerCase() === 'buy' && moment.duration(moment().diff(moment(order.timeSubmitted))).asMinutes() > 30) {
          return true;
        }
        return false;
      });
      console.log('age of order: ', currentOrders);
      return stagnantOrderIdx > -1;
    }
    return false;
  }

  isDayTrading(): boolean {
    return this.firstFormGroup.value.orderType.toLowerCase() === 'daytrade';
  }

  getStopLossSetting(): number {
    if (this.firstFormGroup.value.lossThreshold < 0) {
      return this.firstFormGroup.value.lossThreshold;
    } else {
      return this.firstFormGroup.value.lossThreshold * -1;
    }
  }

  isSellOrder(): boolean {
    return this.order.side.toLowerCase() === 'sell';
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
      this.schedulerService.schedule(() => {
        this.backtestService.getDaytradeRecommendation(this.order.holding.symbol, lastPrice, estimatedPrice, { minQuotes: 81 })
          .subscribe(
            analysis => {
              this.processAnalysis(daytradeType, analysis, lastPrice, moment().valueOf());
              return null;
            },
            error => {
              this.error = 'Issue getting analysis.';
            }
          );
      }, 'getDaytradeRecommendation', this.globalSettingsService.stopTime);

    }
  }

  goLive() {
    this.initRun();
    this.step();
  }

  hasReachedOrderLimit() {
    const tradeType = this.firstFormGroup.value.orderType.toLowerCase();
    if (this.isDayTrading()) {
      return (this.buyCount >= this.firstFormGroup.value.quantity) &&
        (this.sellCount >= this.firstFormGroup.value.quantity);
    } else if (tradeType === 'buy') {
      return (this.buyCount >= this.firstFormGroup.value.quantity);
    } else if (tradeType === 'sell') {
      return this.sellCount >= this.firstFormGroup.value.quantity;
    }
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
    this.activeIndex = 1;
  }

  runMlBuySell() {
    if (this.config.MlBuySellAtClose) {
      const orderQuantity = this.firstFormGroup.value.quantity - this.buyCount;

      if (orderQuantity > 0) {
        this.orderingService.executeMlOrder(this.order.holding.symbol, orderQuantity);
      }
    }
  }

  checkMLService() {
    const mlServiceError = () => {
      this.messageService.add({
        key: 'mlServiceStatus',
        severity: 'danger',
        summary: 'Machine learning service is currently offline'
      });
    };

    this.backtestService.pingArmidillo().subscribe(
      (data: ServiceStatus) => {
        if (!data || data.status !== 'UP') {
          mlServiceError();
        }
      },
      () => {
        mlServiceError();
      });

    this.schedulerService.schedule(() => {
      this.machineLearningService
        .trainDaytrade(this.order.holding.symbol,
          moment().add({ days: 1 }).format('YYYY-MM-DD'),
          moment().subtract({ days: moment().day() === 0 ? 2 : 1 }).format('YYYY-MM-DD'),
          0.7,
          this.globalSettingsService.daytradeAlgo
        )
        .subscribe();
    }, `calibrateOne${this.order.holding.symbol}`, null, false, 180000);
  }

  test() {
    this.play();
    this.dialogService.open(BacktestTableComponent, {
      data: {
        symbol: this.order.holding.symbol
      },
      header: 'Previous day backtest'
    });
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
