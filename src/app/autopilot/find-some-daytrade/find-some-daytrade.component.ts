import { Component, OnInit } from '@angular/core';
import * as moment from 'moment-timezone';

import { BacktestService, PortfolioService } from '@shared/services';
import { BacktestTableService } from 'src/app/backtest-table/backtest-table.service';

@Component({
  selector: 'app-find-some-daytrade',
  templateUrl: './find-some-daytrade.component.html',
  styleUrls: ['./find-some-daytrade.component.css']
})
export class FindSomeDaytradeComponent implements OnInit {
  currentTrades = [];
  constructor(private backtestTableService: BacktestTableService,
    private backtestService: BacktestService,
    private portfolioService: PortfolioService
  ) { }

  ngOnInit(): void {
    this.findTrades();
  }

  async findTrades() {
    this.currentTrades = [];
    await this.portfolioService.getTdBalance().toPromise();

    const savedBacktestData = this.backtestTableService.getStorage('backtest');
    for (const backtestDataKey in savedBacktestData) {
      const backtestData = savedBacktestData[backtestDataKey];
      if (backtestData) {
        if (backtestData.ml > 0.5) {
          const daytradeData = await this.backtestService.getDaytradeRecommendation(backtestData.stock, backtestData.high52, backtestData.high52, { minQuotes: 81 }).toPromise();
          if (daytradeData.recommendation.toLowerCase() === 'buy') {
            this.addTrade(backtestData.stock, daytradeData);
          } else {
            const indicator = daytradeData.data.indicator;
            if (indicator.mfiLeft < 30 || indicator.bbandBreakout || indicator.close < indicator.bband80[0][0]) {
              this.addTrade(backtestData.stock, daytradeData);
            }
          }
          await this.delayRequest();
        }
      }
    }
  }

  delayRequest() {
    return new Promise(function (resolve) {
      setTimeout(resolve, 2000);
    });
  }
  addTrade(stock: string, daytradeData) {
    let recommendationsArr = [];
    for (const key in daytradeData) {
      const daytradeRec = daytradeData[key];
      if (typeof daytradeRec === 'string' && daytradeRec.toLowerCase() === 'bullish') {
        recommendationsArr.push(key);
      }
    }
    this.currentTrades.push({ stock: stock, recommendations: recommendationsArr.join(','), time: moment().format('hh:mm a z') });
  }
}
