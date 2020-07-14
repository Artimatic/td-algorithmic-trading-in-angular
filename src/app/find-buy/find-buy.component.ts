import { Component, OnInit, OnDestroy } from '@angular/core';
import { BacktestService } from '@shared/services/backtest.service';
import * as moment from 'moment';
import { BacktestResponse } from '../rh-table';
import Stocks from '../rh-table/backtest-stocks.constant';
import { Subscription, Subject, Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { DailyBacktestService } from '@shared/daily-backtest.service';
import { PortfolioService } from '@shared/services/portfolio.service';
import { CartService } from '@shared/services/cart.service';
import { SmartOrder } from '@shared/models/smart-order';
import * as _ from 'lodash';
import { MatSnackBar } from '@angular/material';

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

  constructor(private backtestService: BacktestService,
    private dailyBacktestService: DailyBacktestService,
    private portfolioService: PortfolioService,
    private cartService: CartService,
    private snackBar: MatSnackBar) { }

  ngOnInit() {
    this.bufferSubject = new Subject();
    this.backtestBuffer = [];
    this.callChainSub = new Subscription();
    this.potentialBuys = [];
    this.buyList = [];
  }

  getBacktestRequest() {
    return (param) => {
      const currentDate = moment().format('YYYY-MM-DD');
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
          });
    };
  }

  queueBacktests() {
    for (let i = 0; i < Stocks.length; i++) {
      this.backtestBuffer.push({ stock: Stocks[i].ticker, sub: this.getBacktestRequest()(Stocks[i]) });
    }

    this.executeBacktests();
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
          if (this.buyList.length < 10) {
            this.triggerNextBacktest();
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
    this.dailyBacktestService.getSignalScores(signals).subscribe((score) => {
      const foundIdx = this.potentialBuys.findIndex((value) => {
        return value.name === stock;
      });

      if (this.potentialBuys[foundIdx].buySignals) {
        const indicators = this.potentialBuys[foundIdx].buySignals;

        for (const i in indicators) {
          if (indicators.hasOwnProperty(i)) {
            this.potentialBuys[foundIdx].buyConfidence += score[indicators[i]].bullishMidTermProfitLoss;
          }
        }

        if (this.potentialBuys[foundIdx].buyConfidence > 0.25) {
          this.buyList.push(this.potentialBuys[foundIdx]);
          this.portfolioBuy(this.potentialBuys[foundIdx]);
        }
      }

      if (this.potentialBuys[foundIdx].sellSignals) {
        const indicators = this.potentialBuys[foundIdx].sellSignals;

        for (const i in indicators) {
          if (indicators.hasOwnProperty(i)) {
            this.potentialBuys[foundIdx].sellConfidence += score[indicators[i]].bullishMidTermProfitLoss;
          }
        }

        if (this.potentialBuys[foundIdx].sellConfidence < -0.3) {
          this.buyList.push(this.potentialBuys[foundIdx]);
          this.portfolioBuy(this.potentialBuys[foundIdx]);
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
    this.portfolioService.getPrice(holding.name).subscribe((price) => {
      this.portfolioService.getTdBalance().subscribe((data) => {
        const quantity = this.getQuantity(price, 0.1, data.availableFundsNonMarginableTrade);

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
      lossThreshold: -0.004,
      profitTarget: 0.009,
      trailingStop: -0.003,
      useStopLoss: true,
      useTrailingStopLoss: false,
      useTakeProfit: true,
      sellAtClose: false
    };
  }

  ngOnDestroy() {
    this.callChainSub.unsubscribe();
  }
}
