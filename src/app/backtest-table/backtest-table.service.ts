import { Injectable } from '@angular/core';
import { OptionsDataService } from '@shared/options-data.service';
import { AiPicksService, BacktestService, PortfolioService } from '@shared/services';
import { Stock } from '@shared/stock.interface';
import * as moment from 'moment-timezone';

@Injectable({
  providedIn: 'root'
})
export class BacktestTableService {

  constructor(private backtestService: BacktestService,
    private aiPicksService: AiPicksService,
    private optionsDataService: OptionsDataService,
    private portfolioService: PortfolioService) { }

  async getBacktestData(symbol: string) {
    const current = moment().format('YYYY-MM-DD');
    const start = moment().subtract(365, 'days').format('YYYY-MM-DD');

    try {
      let indicatorResults;
      try {
        indicatorResults = await this.backtestService.getBacktestEvaluation(symbol, start, current, 'daily-indicators').toPromise();
        this.addToOrderHistoryStorage(symbol, indicatorResults.orderHistory);
        indicatorResults.stock = symbol;

        const lastSignal = indicatorResults.signals[indicatorResults.signals.length - 1];
        const buySignals = [];
        const sellSignals = [];
        for (const indicator in lastSignal.recommendation) {
          if (lastSignal.recommendation.hasOwnProperty(indicator)) {
            if (lastSignal.recommendation[indicator] === 'Bullish') {
              buySignals.push(indicator);
            } else if (lastSignal.recommendation[indicator] === 'Bearish') {
              sellSignals.push(indicator);
            }
          }
        }

        const optionsData = await this.optionsDataService.getImpliedMove(symbol).toPromise();
        const instruments = await this.portfolioService.getInstrument(symbol).toPromise();
        const callsCount = optionsData.strategy.secondaryLeg.totalVolume;
        const putsCount = optionsData.strategy.primaryLeg.totalVolume;
        const optionsVolume = Number(callsCount) + Number(putsCount);
        let latestMlResult = { value: null };
        try {
          latestMlResult = await this.aiPicksService.trainAndActivate(symbol);
        } catch (err) {
          console.log('training error: ', new Date().toString(), latestMlResult);
        }

        const tableObj = {
          recommendation: indicatorResults.recommendation,
          stock: indicatorResults.stock,
          returns: indicatorResults.returns,
          total: indicatorResults.total,
          invested: indicatorResults.invested,
          profitableTrades: indicatorResults.profitableTrades,
          totalTrades: indicatorResults.totalTrades,
          lastVolume: indicatorResults.lastVolume || null,
          totalReturns: indicatorResults.totalReturns || null,
          lastPrice: indicatorResults.lastPrice || null,
          ml: latestMlResult.value,
          impliedMovement: optionsData.move,
          optionsVolume: optionsVolume,
          marketCap: instruments[symbol].fundamental.marketCap,
          strongbuySignals: [],
          buySignals: [],
          strongsellSignals: [],
          sellSignals: [],
          high52: instruments[symbol].fundamental.high52
        };

        this.addToResultStorage(tableObj);
        return tableObj;
      } catch {
        indicatorResults = {
          stock: symbol
        };
        // this.addToBlackList(symbol);
      }
    } catch (error) {
      console.log('Backtest table error', new Date().toString(), error);
    }
    return null;
  }

  addToResultStorage(result: Stock) {
    this.addToStorage('backtest', result.stock, result);
  }

  addToOrderHistoryStorage(symbol: string, tradingHistory: any[]) {
    const storageName = 'orderHistory';
    this.addToStorage(storageName, symbol, tradingHistory);
  }

  addPair(symbol: string, newPairValue: any) {
    const storage = JSON.parse(localStorage.getItem('tradingPairs'));
    if (storage) {
      storage[symbol] = [].concat(storage[symbol]);
      storage[symbol].push(newPairValue)
      console.log('set', storage, JSON.stringify(storage));
      localStorage.setItem('tradingPairs', JSON.stringify(storage));
    } else {
      const newStorageObj = {};
      newStorageObj[symbol] = [newPairValue];
      console.log('set2', newStorageObj, JSON.stringify(newStorageObj));

      localStorage.setItem('tradingPairs', JSON.stringify(newStorageObj));
    }
  }

  addToStorage(storageName: string, key: string, value: any) {
    const storage = JSON.parse(localStorage.getItem(storageName));
    if (storage) {
      storage[key] = value;
      localStorage.setItem(storageName, JSON.stringify(storage));
    } else {
      const newStorageObj = {};
      newStorageObj[key] = value;
      localStorage.setItem(storageName, JSON.stringify(newStorageObj));
    }
  }

  getStorage(storageName: string) {
    const storage = JSON.parse(localStorage.getItem(storageName));

    return storage ? storage : {};
  }

  addToBlackList(ticker: string) {
    const backtestBlacklist = JSON.parse(localStorage.getItem('blacklist'));
    if (backtestBlacklist) {
      if (!backtestBlacklist[ticker]) {
        backtestBlacklist[ticker] = true;
        localStorage.setItem('blacklist', JSON.stringify(backtestBlacklist));
      }
    } else {
      const newStorageObj = {};
      newStorageObj[ticker] = true;
      localStorage.setItem('blacklist', JSON.stringify(newStorageObj));
    }
  }

  findPair(symbol: string) {
    const storedTradingHistory = this.getStorage('orderHistory');
    const orderHistory = storedTradingHistory[symbol];
    if (orderHistory) {
      for (const h in storedTradingHistory) {
        if (h !== symbol) {
          const targetHistory = storedTradingHistory[h];
          this.getCorrelationAndAdd(symbol, orderHistory, h, targetHistory);
        }
      }
    } else {
      console.log('no history found');
    }
  }

  getCorrelationAndAdd(symbol: string, orderHistory: any[], targetSymbol: string, targetHistory: any[]) {
    const corr = this.getPairCorrelation(orderHistory, targetHistory);
    if (corr) {
      this.addPair(symbol, {symbol: targetSymbol, correlation: corr });
    }
  }

  getPairCorrelation(orderHistory, targetHistory): number {
    let primaryHistoryCounter = orderHistory.length - 1;
    let targetHistoryCounter = targetHistory.length - 1;
    let correlatingOrderCounter = 0;
    while (primaryHistoryCounter > 0 && targetHistoryCounter > 0) {
      const primaryDate = orderHistory[primaryHistoryCounter].date;
      const targetDate = targetHistory[targetHistoryCounter].date;
      if (Math.abs(moment(primaryDate).diff(moment(targetDate), 'day')) < 10) {
        correlatingOrderCounter++;
        primaryHistoryCounter--;
        targetHistoryCounter--;
      } else if (moment(primaryDate).diff(moment(targetDate), 'day') > 0) {
        primaryHistoryCounter--;
      } else {
        targetHistoryCounter--;
      }
    }
    return Number((correlatingOrderCounter / ((orderHistory.length + targetHistory.length) / 2)).toFixed(2));
  }
}
