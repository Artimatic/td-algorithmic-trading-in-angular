import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import * as moment from 'moment-timezone';

import { BacktestService, DaytradeService, MachineLearningService, PortfolioService } from '@shared/services';
import { BacktestTableService } from 'src/app/backtest-table/backtest-table.service';
import { MachineDaytradingService } from 'src/app/machine-daytrading/machine-daytrading.service';
import { MessageService } from 'primeng/api';
import { FindDaytradeService, StockTrade } from '../find-daytrade.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PersonalBullishPicks } from 'src/app/rh-table/backtest-stocks.constant';
import { GlobalSettingsService } from 'src/app/settings/global-settings.service';

interface Daytrade {
  stock: string;
  daytradeIndicators: any;
}

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
  mostRelevantStockList: Daytrade[] = [];
  currentCycleList: Daytrade[] = [];
  processSymbol$ = new Subject<string>();
  delay;

  constructor(private backtestTableService: BacktestTableService,
    private backtestService: BacktestService,
    private portfolioService: PortfolioService,
    private daytradeService: DaytradeService,
    private machineDaytradingService: MachineDaytradingService,
    private messageService: MessageService,
    private findDaytradeService: FindDaytradeService,
    private machineLearningService: MachineLearningService,
    private globalSettingsService: GlobalSettingsService,
    private ref: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.processSymbol$
      .pipe(takeUntil(this.destroy$))
      .subscribe(sym => {
        this.getRecommendations(sym);
      });
    this.findDaytradeService.getRefreshObserver()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (!this.lastBacktest || Math.abs(this.lastBacktest.diff(moment(), 'minutes')) > 5) {
          this.findTrades();
        }
      });
      this.delay = this.delayRequest();
  }

  async getCurrentHoldings() {
    this.currentHoldings = [];
    const data = await this.portfolioService.getTdPortfolio().toPromise();
    this.currentTrades = this.currentTrades.filter(trade => !trade.time || moment().diff(moment(trade.time), 'minutes') < 30);

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
    this.ref.detectChanges();
  }

  async getCashBalance() {
    const balance = await this.portfolioService.getTdBalance().toPromise();
    this.dollarAmount = Math.floor((balance?.buyingPower | 0) * 0.05);
  }

  updateStockList(symbol, daytradeIndicators) {
    const foundIdx = this.mostRelevantStockList.findIndex(s => s.stock === symbol);
    if (foundIdx > -1) {
      this.mostRelevantStockList[foundIdx] = { stock: symbol, daytradeIndicators };
    } else {
      this.mostRelevantStockList.push({ stock: symbol, daytradeIndicators });
    }

    if (this.mostRelevantStockList.length > 10) {
      this.mostRelevantStockList = this.mostRelevantStockList.filter((stock: Daytrade) => {
        if (!stock.daytradeIndicators) {
          return true;
        } else if ((stock.daytradeIndicators?.mfiLeft && stock.daytradeIndicators?.mfiLeft < 30) || stock.daytradeIndicators.bbandBreakout || (stock.daytradeIndicators.bband80[0][0] && stock.daytradeIndicators.close < (1.1 * stock.daytradeIndicators.bband80[0][0]))) {
          return true;
        }
        return false;
      });
    }
  }

  async getRecommendations(symbol: string) {
    this.lastBacktest = moment();
    let daytradeData = await this.backtestService.getDaytradeRecommendation(symbol, null, null, { minQuotes: 81 }).toPromise();

    if (daytradeData.recommendation.toLowerCase() === 'buy') {
      this.addTrade(symbol, daytradeData);
    } else {
      const indicator = daytradeData.data.indicator;
      const mlResult = await this.machineLearningService
        .trainDaytrade(symbol.toUpperCase(),
          moment().add({ days: 1 }).format('YYYY-MM-DD'),
          moment().subtract({ days: 1 }).format('YYYY-MM-DD'),
          1,
          this.globalSettingsService.daytradeAlgo
        ).toPromise();
      if (mlResult[0]?.nextOutput > 0.6) {
        this.addTrade(symbol, daytradeData);
      } else if ((indicator?.mfiLeft && indicator?.mfiLeft < 25) || indicator.bbandBreakout || (indicator.bband80[0][0] && indicator.close < indicator.bband80[0][0])) {
        this.addTrade(symbol, daytradeData);
      } else {
        this.updateStockList(symbol, indicator);
      }
    }
    if (this.currentCycleList.length > 0) {
      this.delay.then(() => {
        this.processSymbol$.next(this.currentCycleList.pop().stock);
      });
    }
  }

  async findTrades() {
    await this.getCashBalance();
    await this.getCurrentHoldings();

    if (!this.currentCycleList.length) {
      const personalPicks = PersonalBullishPicks.map(pick => {
        return { stock: pick.ticker, daytradeIndicators: null };
      });
      this.currentCycleList = this.mostRelevantStockList.concat(personalPicks)

      const savedBacktestData = this.backtestTableService.getStorage('backtest');
      for (const backtestDataKey in savedBacktestData) {
        const backtestData = savedBacktestData[backtestDataKey];
        if (backtestData) {
          if (backtestData.ml > 0.5) {
            this.currentCycleList.push({ stock: backtestData.stock, daytradeIndicators: null });
          }
        }
      }
    }
    this.delay.then(() => {
      this.processSymbol$.next(this.currentCycleList.pop().stock);
    });
  }

  delayRequest() {
    return new Promise(function (resolve) {
      setTimeout(resolve, 10000);
    })
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
    this.ref.detectChanges();
  }

  async checkCurrentHoldings() {
    await this.delay();
    await this.getCurrentHoldings();
    this.currentTrades = this.currentTrades.map((trade: StockTrade) => {
      const found = this.currentHoldings.find((value) => value.stock === trade.stock);
      if (found) {
        return found;
      } else {
        if (trade.orderQuantity) {
          trade.orderQuantity = 0;
        }
      }
      return trade;
    });
    this.ref.detectChanges();
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
