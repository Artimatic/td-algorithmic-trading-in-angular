import { Component, OnInit } from '@angular/core';
import * as moment from 'moment-timezone';

import { BacktestService, DaytradeService, PortfolioService } from '@shared/services';
import { BacktestTableService } from 'src/app/backtest-table/backtest-table.service';
import { SchedulerService } from '@shared/service/scheduler.service';
import { MachineDaytradingService } from 'src/app/machine-daytrading/machine-daytrading.service';

@Component({
  selector: 'app-find-some-daytrade',
  templateUrl: './find-some-daytrade.component.html',
  styleUrls: ['./find-some-daytrade.component.css']
})
export class FindSomeDaytradeComponent implements OnInit {
  currentTrades = [];
  dollarAmount = 1000;
  constructor(private backtestTableService: BacktestTableService,
    private backtestService: BacktestService,
    private portfolioService: PortfolioService,
    private schedulerService: SchedulerService,
    private daytradeService: DaytradeService,
    private machineDaytradingService: MachineDaytradingService
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
          this.schedulerService.schedule(async () => {
            let daytradeData;
            try {
              daytradeData = await this.backtestService.getDaytradeRecommendation(backtestData.stock, backtestData.high52, backtestData.high52, { minQuotes: 81 }).toPromise();
            } catch(err) {
              await this.delayRequest();
              daytradeData = await this.backtestService.getDaytradeRecommendation(backtestData.stock, backtestData.high52, backtestData.high52, { minQuotes: 81 }).toPromise();
            }
            if (daytradeData.recommendation.toLowerCase() === 'buy') {
              this.addTrade(backtestData.stock, daytradeData);
            } else {
              const indicator = daytradeData.data.indicator;
              if (indicator.mfiLeft < 30 || indicator.bbandBreakout || indicator.close < indicator.bband80[0][0]) {
                this.addTrade(backtestData.stock, daytradeData);
              }
            }
          }, 'getDaytradeRecommendation');
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

  async sendBuy(symbol: string) {
    const tiingoQuote = await this.backtestService.getLastPriceTiingo({ symbol: symbol }).toPromise();
    const lastPrice = Number(tiingoQuote[0].last);

    const balance = await this.machineDaytradingService.getPortfolioBalance().toPromise();
    const currentBalance = balance.cashBalance;
    const orderQuantity = Math.floor(this.dollarAmount / lastPrice) || 1;
    if (currentBalance > orderQuantity * lastPrice)  {
      const order = {
        symbol: symbol,
        pl: 0,
        netLiq: 0,
        shares: 0,
        alloc: 0,
        recommendation: 'None',
        buyReasons: '',
        sellReasons: '',
        buyConfidence: 0,
        sellConfidence: 0,
        prediction: null
      };
      const buyOrder = this.daytradeService.createOrder(order, 'Buy', orderQuantity, lastPrice, 0)
      this.daytradeService.sendBuy(buyOrder, 'limit', () => {}, () => {});
    }
  }
}
