import { Component, OnInit, OnDestroy } from '@angular/core';
import { BacktestService } from '@shared/services/backtest.service';
import * as moment from 'moment';
import { BacktestResponse } from '../rh-table';
import Stocks from '../rh-table/backtest-stocks.constant';
import { Subscription, Subject, Observable } from 'rxjs';
import { take, takeWhile } from 'rxjs/operators';
import { DailyBacktestService } from '@shared/daily-backtest.service';
import { PortfolioService } from '@shared/services/portfolio.service';
import { CartService } from '@shared/services/cart.service';
import { SmartOrder } from '@shared/models/smart-order';
import * as _ from 'lodash';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AiPicksService } from '@shared/services';
import { GlobalSettingsService } from '../settings/global-settings.service';

export interface PotentialBuy {
  name: string;
  buySignals: string[];
  sellSignals: string[];
  buyReasons: string;
  sellReasons: string;
  buyConfidence: number;
  sellConfidence: number;
}

@Component({
  selector: 'app-find-buy',
  templateUrl: './find-buy.component.html',
  styleUrls: ['./find-buy.component.css']
})
export class FindBuyComponent implements OnInit, OnDestroy {
  private callChainSub: Subscription;
  private backtestBuffer: { stock: string; sub: Observable<any>; }[];
  private bufferSubject: Subject<void>;
  public potentialBuys: PotentialBuy[];
  public buyList: PotentialBuy[];
  loading = false;
  buyOrdersCount: number;
  prefillOrderForm;

  constructor(private backtestService: BacktestService,
    private dailyBacktestService: DailyBacktestService,
    private portfolioService: PortfolioService,
    private aiPicksService: AiPicksService,
    private cartService: CartService,
    private globalSettingsService: GlobalSettingsService,
    private snackBar: MatSnackBar) { }

  ngOnInit() {
    this.bufferSubject = new Subject();
    this.backtestBuffer = [];
    this.callChainSub = new Subscription();
    this.potentialBuys = [];
    this.buyList = [];
    this.buyOrdersCount = 0;
    setTimeout(() => {
      this.autoRun();
    }, 5000);
  }

  getBacktestRequest() {
    this.loading = true;
    return (param) => {
      const currentDate = this.globalSettingsService.getLastTradeDate().format('YYYY-MM-DD');
      const startDate = moment().subtract(365, 'days').format('YYYY-MM-DD');

      return this.backtestService.getBacktestEvaluation(param.ticker, startDate, currentDate, 'daily-indicators')
        .map(
          (testResults: BacktestResponse) => {
            if (testResults) {
              const symbol = param.ticker;

              testResults.stock = symbol;
              const indicatorResults: BacktestResponse = testResults;

              if (indicatorResults.recommendation.toLowerCase() === 'buy' ||
                indicatorResults.recommendation.toLowerCase() === 'strongbuy' ||
                indicatorResults.recommendation.toLowerCase() === 'sell' ||
                indicatorResults.recommendation.toLowerCase() === 'strongsell') {
                const potential = {
                  name: indicatorResults.stock,
                  buySignals: [],
                  sellSignals: [],
                  buyReasons: '',
                  sellReasons: '',
                  buyConfidence: 0,
                  sellConfidence: 0
                };

                const lastSignal = indicatorResults.signals[indicatorResults.signals.length - 1];
                for (const indicator in lastSignal.recommendation) {
                  if (lastSignal.recommendation.hasOwnProperty(indicator)) {
                    if (lastSignal.recommendation[indicator] === 'Bullish') {
                      potential.buySignals.push(indicator);
                    } else if (lastSignal.recommendation[indicator] === 'Bearish') {
                      potential.sellSignals.push(indicator);
                    }
                  }
                }

                potential.buyReasons = potential.buySignals.join(',');
                potential.sellReasons = potential.sellSignals.join(',');

                this.potentialBuys.push(potential);
                this.getIndicatorScore(potential.name, testResults.signals);
              }
            }
            this.loading = false;
          });
    };
  }

  queueBacktests() {
    for (let i = 0; i < Stocks.length; i++) {
      this.backtestBuffer.push({ stock: Stocks[i].ticker, sub: this.getBacktestRequest()(Stocks[i]) });
    }

    this.executeBacktests();
  }

  autoRun() {
    this.queueBacktests();
  }

  findStock() {
    this.queueBacktests();
  }

  executeBacktests() {
    this.bufferSubject.subscribe(() => {
      const backtest = this.backtestBuffer[0];
      this.callChainSub.add(backtest.sub
        .pipe(take(1))
        .subscribe(() => {
          this.backtestBuffer.shift();
          if (this.buyOrdersCount < 1) {
            setTimeout(() => {
              this.triggerNextBacktest();
            }, 1000);
          }
        }, error => {
          console.log(`Error on ${backtest.stock}`, error);
          this.backtestBuffer.shift();
          this.triggerNextBacktest();
        }));
    });

    this.triggerNextBacktest();
  }

  getIndicatorScore(stock, signals) {
    this.dailyBacktestService.getSignalScores(signals)
      .pipe(take(1))
      .subscribe((score) => {
        const foundIdx = this.potentialBuys.findIndex((value) => {
          return value.name === stock;
        });

        const potentialBuy = this.potentialBuys[foundIdx];
        if (potentialBuy.buySignals) {
          const indicators = potentialBuy.buySignals;

          for (const i in indicators) {
            if (indicators.hasOwnProperty(i)) {
              potentialBuy.buyConfidence += score[indicators[i]].bullishMidTermProfitLoss;
            }
          }

          if (potentialBuy.buyConfidence > 0.23) {
            this.buyList.push(potentialBuy);

            this.aiPicksService.tickerBuyRecommendationQueue.next(potentialBuy.name);

            this.aiPicksService.mlBuyResults
              .pipe(takeWhile(val => {
                return val.label !== potentialBuy.name;
              }))
              .subscribe(val => {
                if (val.label === potentialBuy.name && val.value[0].prediction > 0.5) {
                  this.portfolioBuy(potentialBuy);
                }
              });
          }
        }

        if (potentialBuy.sellSignals) {
          const indicators = potentialBuy.sellSignals;

          for (const i in indicators) {
            if (indicators.hasOwnProperty(i)) {
              potentialBuy.sellConfidence += score[indicators[i]].bullishMidTermProfitLoss;
            }
          }

          if (potentialBuy.sellConfidence < -0.3) {
            this.buyList.push(potentialBuy);
            this.aiPicksService.tickerBuyRecommendationQueue.next(potentialBuy.name);


            this.aiPicksService.mlBuyResults
              .pipe(takeWhile(val => {
                return val.label !== potentialBuy.name;
              }))
              .subscribe(val => {
                if (val.label === potentialBuy.name && val.value[0].prediction > 0.5) {
                  this.portfolioBuy(potentialBuy);
                }
              });
          }
        }
      });
  }

  triggerNextBacktest() {
    if (this.backtestBuffer.length > 0) {
      this.bufferSubject.next();
    }
  }

  portfolioBuy(holding: PotentialBuy) {
    this.buyOrdersCount++;
    this.portfolioService.getPrice(holding.name).subscribe((price) => {
      this.portfolioService.getTdBalance().subscribe((data) => {
        const quantity = this.getQuantity(price, 1, data.cashAvailableForTrading);

        const order = this.buildOrder(holding.name, quantity, price);
        this.cartService.addToCart(order);
        this.snackBar.open('Added order for ' + holding.name, 'Dismiss');
      });
    });
  }

  private getQuantity(stockPrice: number, allocationPct: number, total: number) {
    const totalCost = _.round(total * allocationPct, 2);
    return _.floor(totalCost / stockPrice);
  }

  buildOrder(symbol: string, quantity = 0, price = 0): SmartOrder {
    return {
      holding: {
        instrument: null,
        symbol,
      },
      quantity,
      price,
      submitted: false,
      pending: false,
      orderSize: _.floor(quantity / 3) || 1,
      side: 'Buy',
      lossThreshold: -0.01,
      profitTarget: 0.05,
      trailingStop: -0.003,
      useStopLoss: true,
      useTrailingStopLoss: false,
      useTakeProfit: false,
      sellAtClose: false
    };
  }

  onRowSelect(event) {
    this.portfolioService.getPrice(event.data.name)
      .pipe(take(1))
      .subscribe((stockPrice: number) => {
        const amount = 1000;
        const quantity = _.floor(amount / stockPrice);
        this.prefillOrderForm = this.cartService.buildOrder(event.data.name, quantity, stockPrice);
      });
  }

  ngOnDestroy() {
    this.callChainSub.unsubscribe();
  }
}
