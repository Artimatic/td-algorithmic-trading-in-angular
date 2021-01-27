import { Component, OnInit } from '@angular/core';
import { BacktestService, PortfolioService, CartService } from '@shared/services';
import { BacktestResponse } from '../rh-table';
import * as moment from 'moment';
import { take } from 'rxjs/operators';
import { GlobalSettingsService } from '../settings/global-settings.service';
import * as _ from 'lodash';
import { SmartOrder } from '@shared/models/smart-order';
import { FormControl, Validators } from '@angular/forms';

@Component({
  selector: 'app-determine-hedge',
  templateUrl: './determine-hedge.component.html',
  styleUrls: ['./determine-hedge.component.css']
})
export class DetermineHedgeComponent implements OnInit {
  loading = false;
  hedgeStock: FormControl;
  indicatorStocks = [];
  cols = [];
  constructor(private portfolioService: PortfolioService,
    private backtestService: BacktestService,
    private globalSettingsService: GlobalSettingsService,
    private cartService: CartService) { }

  ngOnInit() {
    this.cols = [
      { field: 'name', header: 'Name' },
      { field: 'recommendation', header: 'Recommendation' }
    ];

    this.hedgeStock = new FormControl('VXX', [
      Validators.required
    ]);
  }

  determineHedge() {
    this.loading = true;
    this.indicatorStocks = [];

    this.getTechnicals('SPY')
      .pipe(take(1))
      .subscribe(spyRecommendation => {
        const hedgededSpy = this.handleRecommendation('SPY', spyRecommendation, 0.7);
        if (!hedgededSpy) {
          this.getTechnicals('QQQ')
            .pipe(take(1))
            .subscribe(qqqRecom => {
              const hedgededQqq = this.handleRecommendation('QQQ', qqqRecom, 0.7);
              if (!hedgededQqq) {
                this.getTechnicals('IWM')
                  .pipe(take(1))
                  .subscribe(iwmRecom => {
                    const hedgededIwm = this.handleRecommendation('IWM', iwmRecom, 0.6);
                    if (!hedgededIwm) {
                      this.getTechnicals('HYG')
                        .pipe(take(1))
                        .subscribe(hygRecom => {
                          const hedgededHyg = this.handleRecommendation('HYG', hygRecom, 0.6);
                          if (!hedgededHyg) {
                            this.getTechnicals('VXX')
                              .pipe(take(1))
                              .subscribe(vxxRecommendation => {
                                vxxRecommendation = vxxRecommendation.toUpperCase();
                                if (vxxRecommendation === 'BULLISH') {
                                  this.indicatorStocks.push({ name: 'VXX', recommendation: 'Bullish' });
                                  this.resolveHedge(0.7);
                                } else if (vxxRecommendation === 'BEARISH') {
                                  this.indicatorStocks.push({ name: 'VXX', recommendation: 'Bearish' });
                                  this.resolveHedge(0);
                                } else {
                                  this.globalSettingsService.get10y2ySpread()
                                    .subscribe(spreadData => {
                                      const changePercent = Number(spreadData.QuickQuoteResult.QuickQuote.change_pct);
                                      if (changePercent < -3) {
                                        this.resolveHedge(0.6);
                                      } else if (changePercent < 0) {
                                        this.resolveHedge(0.3);
                                      } else {
                                        this.resolveHedge(0);
                                      }
                                    });
                                }
                              });
                          }
                        });
                    }
                  });
              }
            });
        }
      });
  }

  handleRecommendation(name: string, recommendation: string, allocation: number) {
    recommendation = recommendation.toUpperCase();
    if (recommendation === 'BEARISH') {
      this.indicatorStocks.push({ name: name, recommendation: 'Bearish' });
      this.resolveHedge(allocation);
      return true;
    } else if (recommendation === 'BULLISH') {
      this.indicatorStocks.push({ name: name, recommendation: 'Bullish' });
      this.resolveHedge(0);
      return true;
    } else {
      return null;
    }
  }

  getTechnicals(stock: string) {
    const currentDate = moment().format('YYYY-MM-DD');
    const startDate = moment().subtract(200, 'days').format('YYYY-MM-DD');

    return this.backtestService.getBacktestEvaluation(stock, startDate, currentDate, 'daily-indicators')
      .map((testResults: BacktestResponse) => {
        let lastRecommendation = null;
        for (let i = testResults.signals.length - 20; i < testResults.signals.length; i++) {
          const signal = testResults.signals[i];
          const recommendation = this.getRecommendation(signal);
          if (recommendation !== null) {
            lastRecommendation = recommendation;
          }
        }

        return lastRecommendation;
      });
  }

  getRecommendation(signal) {
    const buySignals = [];
    const sellSignals = [];
    for (const indicator in signal.recommendation) {
      if (signal.recommendation.hasOwnProperty(indicator)) {
        if (signal.recommendation[indicator].toLowerCase() === 'bullish') {
          buySignals.push(indicator);
        } else if (signal.recommendation[indicator].toLowerCase() === 'bearish') {
          sellSignals.push(indicator);
        }
      }
    }

    if (buySignals.length > sellSignals.length) {
      return 'Bullish';
    } else if (buySignals.length < sellSignals.length) {
      return 'Bearish';
    } else {
      return null;
    }
  }

  resolveHedge(allocation) {
    this.portfolioService.getTdBalance().subscribe((balance) => {
      const cash = balance.cashAvailableForTrading;
      const longMarketValue = balance.longMarketValue;

      this.portfolioService.getTdPortfolio().subscribe((data) => {
        const hedgeHolding = data.find((holding) => holding.instrument.symbol === this.hedgeStock.value);
        const hedgeHoldingMarketValue = hedgeHolding ? hedgeHolding.marketValue : 0;
        const actualAllocation = hedgeHoldingMarketValue / longMarketValue;
        if (actualAllocation < allocation) {
          this.portfolioBuy(this.hedgeStock.value, allocation - actualAllocation, cash);
        } else if (hedgeHolding) {
          this.portfolioSell(this.hedgeStock.value, longMarketValue * allocation, hedgeHolding.marketValue);
        }

        this.loading = false;
      });
    });
  }

  portfolioBuy(stock, desiredAllocation, cash) {
    this.portfolioService.getPrice(stock).subscribe((price) => {
      this.portfolioService.getTdBalance().subscribe((data) => {
        const allocation = data.cashAvailableForTrading >= desiredAllocation ? desiredAllocation : data.cashAvailableForTrading;
        const quantity = this.getQuantity(price, allocation, cash);

        const order = this.buildOrder(stock, quantity, price, 'Buy');
        this.cartService.addToCart(order);
      });
    });
  }

  portfolioSell(stock: string, desiredLongMarketValue: number, actualAllocation: number) {
    const sellValue = actualAllocation - desiredLongMarketValue;
    this.portfolioService.getPrice(stock).subscribe((price) => {
      const sellShareAmt = _.floor(sellValue / price);

      const order = this.buildOrder(stock, sellShareAmt, price, 'Sell');
      this.cartService.addToCart(order);
    });
  }

  buildOrder(symbol: string, quantity = 0, price = 0, side = 'DayTrade'): SmartOrder {
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
      side,
      lossThreshold: -0.005,
      profitTarget: 0.009,
      trailingStop: -0.003,
      useStopLoss: true,
      useTrailingStopLoss: false,
      useTakeProfit: true,
      sellAtClose: side === 'DayTrade' ? true : false
    };
  }

  private getQuantity(stockPrice: number, allocationPct: number, total: number) {
    const totalCost = _.round(total * allocationPct, 2);
    return _.floor(totalCost / stockPrice);
  }

}
