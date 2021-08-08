import { Component, OnInit } from '@angular/core';
import { PortfolioService, BacktestService, PortfolioInfoHolding } from '@shared/services';
import { BacktestResponse } from '../rh-table';
import { DailyBacktestService } from '@shared/daily-backtest.service';
import * as moment from 'moment';
import { CartService } from '@shared/services/cart.service';
import * as _ from 'lodash';
import { SmartOrder } from '@shared/models/smart-order';
import { take } from 'rxjs/operators';

// bearishMidTermProfitLoss: 0
// bearishMidTermSignals: 0
// bearishProfitLoss: -0.519616494419887
// bearishShortTermProfitLoss: 0
// bearishShortTermSignals: 0
// bearishSignals: 18
// bullishMidTermProfitLoss: -2.590042061404361
// bullishMidTermSignals: 9
// bullishProfitLoss: -2.279701048264742
// bullishShortTermProfitLoss: 0
// bullishShortTermSignals: 0
// bullishSignals: 11

@Component({
  selector: 'app-portfolio-info',
  templateUrl: './portfolio-info.component.html',
  styleUrls: ['./portfolio-info.component.scss']
})
export class PortfolioInfoComponent implements OnInit {
  holdings: PortfolioInfoHolding[];
  prefillOrderForm;
  cols;

  constructor(private portfolioService: PortfolioService,
    private backtestService: BacktestService,
    private dailyBacktestService: DailyBacktestService,
    private cartService: CartService) { }

  ngOnInit() {
    this.init();
  }

  getRecommendationReason(recommendation) {
    const reasons = {
      buyReasons: '',
      sellReasons: ''
    };

    const buyReasons = [];
    const sellReasons = [];

    for (const rec in recommendation) {
      if (recommendation.hasOwnProperty(rec)) {
        if (recommendation[rec].toLowerCase() === 'bullish') {
          buyReasons.push(rec);
        } else if (recommendation[rec].toLowerCase() === 'bearish') {
          sellReasons.push(rec);
        }
      }
    }

    reasons.buyReasons += buyReasons.join(',');
    reasons.sellReasons += sellReasons.join(',');

    return reasons;
  }

  getTechnicalIndicators(stock: string, startDate: string, currentDate: string) {
    return this.backtestService.getBacktestEvaluation(stock, startDate, currentDate, 'daily-indicators')
      .map((indicatorResults: BacktestResponse) => {
        this.checkForStopLoss();
        this.getIndicatorScore(stock, indicatorResults.signals);
        return indicatorResults.signals[indicatorResults.signals.length - 1];
      });
  }

  getIndicatorScore(stock, signals) {
    this.dailyBacktestService.getSignalScores(signals).subscribe((score) => {
      const foundIdx = this.holdings.findIndex((value) => {
        return value.name === stock;
      });

      if (this.holdings[foundIdx].buyReasons) {
        const indicators = this.holdings[foundIdx].buyReasons.split(',');

        for (const i in indicators) {
          if (indicators.hasOwnProperty(i)) {
            this.holdings[foundIdx].buyConfidence += score[indicators[i]].bullishMidTermProfitLoss;
            this.analyseRecommendations(this.holdings[foundIdx]);
          }
        }
      }
      if (this.holdings[foundIdx].sellReasons) {
        const indicators = this.holdings[foundIdx].sellReasons.split(',');
        for (const i in indicators) {
          if (indicators.hasOwnProperty(i)) {
            this.holdings[foundIdx].sellConfidence += score[indicators[i]].bearishMidTermProfitLoss;
            this.analyseRecommendations(this.holdings[foundIdx]);
          }
        }
      }
    });
  }

  analyseRecommendations(holding: PortfolioInfoHolding) {
    if (holding.recommendation.toLowerCase() === 'buy') {
      if (holding.buyConfidence > 0) {
        console.log('Buying ', holding.name);
        this.portfolioBuy(holding);
      }
    } else if (holding.recommendation.toLowerCase() === 'sell') {
      if (holding.sellConfidence > 0) {
        console.log('Selling ', holding.name);
        this.portfolioSell(holding);
      }
    }
  }

  portfolioBuy(holding: PortfolioInfoHolding) {
    this.portfolioService.getPrice(holding.name).subscribe((price) => {
      this.portfolioService.getTdBalance().subscribe((data) => {
        const quantity = this.getQuantity(price, 0.1, data.cashAvailableForTrading);

        const order = this.buildOrder(holding.name, quantity, price, 'Buy');
        this.cartService.addToCart(order);
      });
    });
  }

  portfolioSell(holding: PortfolioInfoHolding) {
    this.portfolioService.getPrice(holding.name).subscribe((price) => {
      const order = this.buildOrder(holding.name, holding.shares, price, 'Sell');
      this.cartService.addToCart(order);
    });
  }

  private getQuantity(stockPrice: number, allocationPct: number, total: number) {
    const totalCost = _.round(total * allocationPct, 2);
    return _.floor(totalCost / stockPrice);
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
      lossThreshold: -0.004,
      profitTarget: 0.009,
      trailingStop: -0.003,
      useStopLoss: true,
      useTrailingStopLoss: false,
      useTakeProfit: true,
      sellAtClose: side === 'DayTrade' ? true : false
    };
  }

  checkForStopLoss() {
    this.holdings.forEach(val => {
      const percentLoss = _.divide(val.pl, val.netLiq);
      if (percentLoss < -0.07) {
        this.portfolioSell(val);
      }
    });
  }

  onRowSelect(event) {
    this.portfolioService.getPrice(event.data.name)
      .pipe(take(1))
      .subscribe((stockPrice: number) => {
        const amount = 1000;
        const quantity = _.floor(amount / stockPrice);
        this.prefillOrderForm = this.cartService.buildOrder(event.data.name, quantity, stockPrice, 'Buy');
      });
  }

  init() {
    this.cols = [
      { field: 'name', header: 'Holding' },
      { field: 'pl', header: 'P/L Open' },
      { field: 'netLiq', header: 'NetLiq' },
      { field: 'shares', header: 'Shares' },
      { field: 'alloc', header: 'Allocation' },
      { field: 'recommendation', header: 'Recommendation' },
      { field: 'buyReasons', header: 'Buy Reasons' },
      { field: 'buyConfidence', header: 'Buy Confidence' },
      { field: 'sellReasons', header: 'Sell Reasons' },
      { field: 'sellConfidence', header: 'Sell Confidence' }
    ];

    this.holdings = [];
    const currentDate = moment().format('YYYY-MM-DD');
    const startDate = moment().subtract(365, 'days').format('YYYY-MM-DD');

    this.portfolioService.getTdBalance().subscribe((balance) => {
      const totalValue = balance.liquidationValue;
      this.portfolioService.getTdPortfolio().subscribe((data) => {
        if (data) {
          data.forEach((holding) => {
            const stock = holding.instrument.symbol;
            let pl;
            if (holding.instrument.assetType.toLowerCase() === 'option') {
              pl = holding.marketValue - (holding.averagePrice * holding.longQuantity) * 100;
            } else {
              pl = holding.marketValue - (holding.averagePrice * holding.longQuantity);
            }
            this.holdings.push({
              name: stock,
              pl,
              netLiq: holding.marketValue,
              shares: holding.longQuantity,
              alloc: (holding.averagePrice * holding.longQuantity) / totalValue,
              recommendation: 'None',
              buyReasons: '',
              sellReasons: '',
              buyConfidence: 0,
              sellConfidence: 0
            });

            if (holding.instrument.assetType.toLowerCase() === 'equity') {
              this.getTechnicalIndicators(holding.instrument.symbol, startDate, currentDate)
                .subscribe((indicators) => {
                  const foundIdx = this.holdings.findIndex((value) => {
                    return value.name === stock;
                  });
                  this.holdings[foundIdx].recommendation = indicators.recommendation.recommendation;
                  const reasons = this.getRecommendationReason(indicators.recommendation);
                  this.holdings[foundIdx].buyReasons = reasons.buyReasons;
                  this.holdings[foundIdx].sellReasons = reasons.sellReasons;
                });
            }
          });
        }
      });
    });
  }

  refresh() {
    this.init();
  }
}
