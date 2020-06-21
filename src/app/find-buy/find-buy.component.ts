import { Component, OnInit } from '@angular/core';
import { BacktestService } from '@shared/services/backtest.service';
import * as moment from 'moment';
import { BacktestResponse } from '../rh-table';
import Stocks from '../rh-table/backtest-stocks.constant';
import { Subscription, Subject, Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { DailyBacktestService } from '@shared/daily-backtest.service';

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
export class FindBuyComponent implements OnInit {
  private callChainSub: Subscription;
  private backtestBuffer: { stock: string; sub: Observable<any>; }[];
  private bufferSubject: Subject<void>;
  public potentialBuys: PotentialBuy[];

  constructor(private backtestService: BacktestService, private dailyBacktestService: DailyBacktestService) { }

  ngOnInit() {
    this.bufferSubject = new Subject();
    this.backtestBuffer = [];
    this.callChainSub = new Subscription();
    this.potentialBuys = [];
  }

  getBacktestRequest() {
    return (param) => {
      const currentDate = moment().format('YYYY-MM-DD');
      const startDate = moment().subtract(1000, 'days').format('YYYY-MM-DD');

      return this.backtestService.getBacktestEvaluation(param.ticker, startDate, currentDate, 'daily-indicators')
        .map(
          (testResults: BacktestResponse) => {
            if (testResults) {
              const symbol = param.ticker;

              testResults.stock = symbol;
              const indicatorResults: BacktestResponse = testResults;

              if (indicatorResults.recommendation.toLowerCase() === 'buy' ||
                indicatorResults.recommendation.toLowerCase() === 'strongbuy') {
                console.log('Buy recommendation ', indicatorResults);
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
    for (let i = 0; i < 10; i++) {
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
          this.triggerNextBacktest();
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
      }
    });
  }

  triggerNextBacktest() {
    if (this.backtestBuffer.length > 0) {
      this.bufferSubject.next();
    }
  }
}
