import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import * as moment from 'moment-timezone';

import { BacktestService, DaytradeService, PortfolioService } from '@shared/services';
import { BacktestTableService } from 'src/app/backtest-table/backtest-table.service';
import { MachineDaytradingService } from 'src/app/machine-daytrading/machine-daytrading.service';
import { MessageService } from 'primeng/api';
import { FindDaytradeService, StockTrade } from '../find-daytrade.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PersonalBullishPicks } from 'src/app/rh-table/backtest-stocks.constant';

@Component({
  selector: 'app-find-some-daytrade',
  templateUrl: './find-some-daytrade.component.html',
  styleUrls: ['./find-some-daytrade.component.css']
})
export class FindSomeDaytradeComponent implements OnInit, OnDestroy {
  currentTrades: StockTrade[] = [];
  currentHoldings: StockTrade[] = [];
  dollarAmount = 1000;
  destroy$ = new Subject();
  lastBacktest = null;
  constructor(private backtestTableService: BacktestTableService,
    private backtestService: BacktestService,
    private portfolioService: PortfolioService,
    private daytradeService: DaytradeService,
    private machineDaytradingService: MachineDaytradingService,
    private messageService: MessageService,
    private findDaytradeService: FindDaytradeService,
    private ref: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.findDaytradeService.getRefreshObserver()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (!this.lastBacktest || Math.abs(this.lastBacktest.diff(moment(), 'minutes')) > 5) {
          this.findTrades();
        }
      });
  }

  async getCurrentHoldings() {
    const data = await this.portfolioService.getTdPortfolio().toPromise();
    if (data) {
      for (const holding of data) {
        if (holding.instrument.assetType.toLowerCase() !== 'option') {
          const newHolding = {
            stock: holding.instrument.symbol,
            orderQuantity: holding.longQuantity
          };

          const foundInCurrentHoldings = this.currentHoldings.find(h => {
            const isFound = (h.stock === newHolding.stock);
            if (isFound) {
              h.orderQuantity = newHolding.orderQuantity;
            }
            return isFound;
          });
          if (!foundInCurrentHoldings) {
            this.currentHoldings.push(newHolding);
          }

          const foundInCurrentTrades = this.currentTrades.find(h => {
            const isFound = (h.stock === newHolding.stock);
            if (isFound) {
              h.orderQuantity = newHolding.orderQuantity;
            }
            return isFound;
          });
          if (!foundInCurrentTrades) {
            this.currentTrades.push(newHolding);
          }
        }
      }
    }
  }

  async getCashBalance() {
    const balance = await this.portfolioService.getTdBalance().toPromise();
    this.dollarAmount = Math.floor((balance?.buyingPower | 0) * 0.1);
  }

  async findTrades() {
    this.currentTrades = [];
    const savedBacktestData = this.backtestTableService.getStorage('backtest');
    for (const stockPick of PersonalBullishPicks) {
      const symbol = stockPick.ticker;
      await this.getCashBalance();
      await this.getCurrentHoldings();
      this.lastBacktest = moment();
      let daytradeData = await this.backtestService.getDaytradeRecommendation(symbol, null, null, { minQuotes: 81 }).toPromise();
      await this.delayRequest();

      if (daytradeData.recommendation.toLowerCase() === 'buy') {
        this.addTrade(symbol, daytradeData);
      } else {
        const indicator = daytradeData.data.indicator;
        if ((indicator?.mfiLeft && indicator?.mfiLeft < 20) || indicator.bbandBreakout || (indicator.bband80[0][0] && indicator.close < indicator.bband80[0][0])) {
          this.addTrade(symbol, daytradeData);
        }
      }
    }

    for (const backtestDataKey in savedBacktestData) {
      const backtestData = savedBacktestData[backtestDataKey];
      if (backtestData) {
        if (backtestData.ml > 0.5) {
          await this.getCashBalance();
          await this.getCurrentHoldings();
          this.lastBacktest = moment();
          let daytradeData;
          try {
            daytradeData = await this.backtestService.getDaytradeRecommendation(backtestData.stock, backtestData.high52, backtestData.high52, { minQuotes: 81 }).toPromise();
          } catch (err) {
            await this.delayRequest();
            daytradeData = await this.backtestService.getDaytradeRecommendation(backtestData.stock, backtestData.high52, backtestData.high52, { minQuotes: 81 }).toPromise();
          }
          if (daytradeData.recommendation.toLowerCase() === 'buy') {
            this.addTrade(backtestData.stock, daytradeData);
          } else {
            const indicator = daytradeData.data.indicator;
            if ((indicator?.mfiLeft && indicator?.mfiLeft < 20) || indicator.bbandBreakout || (indicator.bband80[0][0] && indicator.close < indicator.bband80[0][0])) {
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
      setTimeout(resolve, 10000);
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
    const found = this.currentHoldings.find((value) => value.stock === stock);
    const trade = { stock: stock, recommendations: recommendationsArr.join(','), time: moment().format('hh:mm a z'), orderQuantity: found?.orderQuantity };
    this.findDaytradeService.addTrade(trade);
    if (!this.currentTrades.find(t => t.stock === trade.stock)) {
      this.currentTrades.push(trade);
    }
    this.ref.markForCheck();
  }

  async checkCurrentHoldings() {
    await this.delayRequest();
    await this.getCurrentHoldings();
    this.currentTrades = this.currentTrades.map((trade: StockTrade) => {
      const found = this.currentHoldings.find((value) => value.stock === trade.stock);
      if (found) {
        return found;
      }
      return trade;
    });
  }

  async sendBuy(symbol: string) {
    const tiingoQuote = await this.backtestService.getLastPriceTiingo({ symbol: symbol }).toPromise();
    const lastPrice = Number(tiingoQuote[0].last);

    const balance = await this.machineDaytradingService.getPortfolioBalance().toPromise();
    const currentBalance = balance.cashBalance;
    const orderQuantity = Math.floor(this.dollarAmount / lastPrice) || 1;
    if (currentBalance > orderQuantity * lastPrice) {
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
      const success = () => {
        this.messageService.add({
          severity: 'success',
          summary: `Bought ${orderQuantity} shares of ${symbol}`
        });
        this.checkCurrentHoldings();
      };

      const failure = (error) => {
        console.log(error);
        this.messageService.add({
          severity: 'danger',
          summary: `Failed to buy ${orderQuantity} shares of ${symbol}`
        });
        this.checkCurrentHoldings();
      };
      this.daytradeService.sendBuy(buyOrder, 'limit', success, failure);
    }
  }

  async sendSell(symbol: string, orderQuantity: number) {
    const tiingoQuote = await this.backtestService.getLastPriceTiingo({ symbol: symbol }).toPromise();
    const lastPrice = Number(tiingoQuote[0].last);


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

    const success = () => {
      this.messageService.add({
        severity: 'success',
        summary: `Sold ${orderQuantity} shares of ${symbol}`
      });
      this.checkCurrentHoldings();
    };

    const failure = (error) => {
      console.log(error);
      this.messageService.add({
        severity: 'danger',
        summary: `Failed to sell ${orderQuantity} shares of ${symbol}`
      });
      this.checkCurrentHoldings();
    };
    const sellOrder = this.daytradeService.createOrder(order, 'Sell', orderQuantity, lastPrice, 0)
    this.daytradeService.sendSell(sellOrder, 'limit', success, failure, failure);
  }

  async maxAllocation() {
    const balance = await this.portfolioService.getTdBalance().toPromise();
    this.dollarAmount = Math.floor((balance?.buyingPower | 0));
  }

  ngOnDestroy() {
    if (this.destroy$) {
      this.destroy$.next();
      this.destroy$.complete();
    }
  }
}
