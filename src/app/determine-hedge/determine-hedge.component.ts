import { Component, OnInit } from '@angular/core';
import { BacktestService, PortfolioService, CartService } from '@shared/services';
import { BacktestResponse } from '../rh-table';
import * as moment from 'moment';
import { take } from 'rxjs/operators';
import { GlobalSettingsService } from '../settings/global-settings.service';
import * as _ from 'lodash';
import { SmartOrder } from '@shared/models/smart-order';

@Component({
  selector: 'app-determine-hedge',
  templateUrl: './determine-hedge.component.html',
  styleUrls: ['./determine-hedge.component.css']
})
export class DetermineHedgeComponent implements OnInit {

  constructor(private portfolioService: PortfolioService,
    private backtestService: BacktestService,
    private globalSettingsService: GlobalSettingsService,
    private cartService: CartService) { }

  ngOnInit() {
    const hedge = {
      stock: 'VXX',
      allocation: 0.1
    };

    this.getTechnicals('SPY')
      .pipe(take(1))
      .subscribe(recommendation => {
        if (recommendation === 'bearish') {
          this.resolveHedge(hedge, 0.2);
        } else {
          this.getTechnicals('QQQ')
            .pipe(take(1))
            .subscribe(recommendation => {
              if (recommendation === 'bearish') {
                this.resolveHedge(hedge, 0.2);
              } else {
                this.getTechnicals('IWM')
                  .pipe(take(1))
                  .subscribe(recommendation => {
                    if (recommendation === 'bearish') {
                      this.resolveHedge(hedge, 0.2);
                    } else {
                      this.getTechnicals('HYG')
                        .pipe(take(1))
                        .subscribe(recommendation => {
                          if (recommendation === 'bearish') {
                            this.resolveHedge(hedge, 0.2);
                          } else {
                            this.getTechnicals('VXX')
                              .pipe(take(1))
                              .subscribe(recommendation => {
                                if (recommendation === 'bullish') {
                                  this.resolveHedge(hedge, 0.2);
                                } else {
                                  this.globalSettingsService.get10y2ySpread()
                                    .subscribe(spreadData => {
                                      const changePercent = Number(spreadData.QuickQuoteResult.QuickQuote.change_pct);
                                      if (changePercent < -3) {
                                        this.resolveHedge(hedge, 0.2);
                                      } else if (changePercent < 0) {
                                        this.resolveHedge(hedge, 0.1);
                                      } else {
                                        this.resolveHedge(hedge, 0);
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

  resolveHedge(hedge, allocation) {
    hedge.allocation = allocation;
    this.portfolioService.getTdBalance().subscribe((data) => {
      const cash = data.cashAvailableForTrading;
      const longMarketValue = data.longMarketValue;

      this.portfolioService.getTdPortfolio().subscribe((data) => {
        const vxxHolding = data.find((holding) => holding.instrument.symbol === 'VXX');
        const vxxHoldingMarketValue = vxxHolding ? vxxHolding.marketValue : 0;
        const actualAllocation = vxxHoldingMarketValue / longMarketValue;
        if (actualAllocation < allocation) {
          this.portfolioBuy('VXX', allocation - actualAllocation, cash);
        } else {
          this.portfolioSell('VXX', longMarketValue * allocation, vxxHolding.marketValue);

        }
      });
    });
  }

  portfolioBuy(stock, desiredAllocation, cash) {
    this.portfolioService.getPrice(stock).subscribe((price) => {
      this.portfolioService.getTdBalance().subscribe((data) => {
        console.log('balance: ', data);
        const quantity = this.getQuantity(price, desiredAllocation, cash);

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
