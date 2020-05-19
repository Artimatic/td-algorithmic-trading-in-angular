import { Component, OnInit } from '@angular/core';
import { PortfolioService, BacktestService } from '@shared/services';
import { BacktestResponse } from '../rh-table';
import { DailyBacktestService } from '@shared/daily-backtest.service';
import * as moment from 'moment';

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
  styleUrls: ['./portfolio-info.component.css']
})
export class PortfolioInfoComponent implements OnInit {
  holdings;
  constructor(private portfolioService: PortfolioService,
    private backtestService: BacktestService,
    private dailyBacktestService: DailyBacktestService) { }

  ngOnInit() {
    this.holdings = [];
    const currentDate = moment().format('YYYY-MM-DD');
    const startDate = moment().subtract(365, 'days').format('YYYY-MM-DD');

    this.portfolioService.getTdPortfolio().subscribe((data) => {
      console.log('Portfolio": ', data);

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
              console.log('updated recommendations: ', this.holdings[foundIdx]);
            });
        }
      });
    });

    this.portfolioService.getTdBalance().subscribe((data) => {
      console.log('balance": ', data);
    });
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
        this.getIndicatorScore(stock, indicatorResults.signals);
        return indicatorResults.signals[indicatorResults.signals.length - 1];
      });
  }

  getIndicatorScore(stock, signals) {
    this.dailyBacktestService.getSignalScores(signals).subscribe((score) => {
      console.log('score: ', stock, score);
      const foundIdx = this.holdings.findIndex((value) => {
        return value.name === stock;
      });

      if (this.holdings[foundIdx].buyReasons) {
        const indicators = this.holdings[foundIdx].buyReasons.split(',');

        for (const i in indicators) {
          if (indicators.hasOwnProperty(i)) {
            this.holdings[foundIdx].buyConfidence += score[i].bullishMidTermProfitLoss;
          }
        }
      }
      if (this.holdings[foundIdx].sellReasons) {
        const indicators  = this.holdings[foundIdx].sellReasons.split(',');
        for (const i in indicators) {
          if (indicators.hasOwnProperty(i)) {
            this.holdings[foundIdx].sellConfidence += score[i].bearishMidTermProfitLoss;
          }
        }
      }
    });
  }

}
