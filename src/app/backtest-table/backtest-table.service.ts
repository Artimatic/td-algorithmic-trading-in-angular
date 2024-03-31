import { Injectable } from '@angular/core';
import { OptionsDataService } from '@shared/options-data.service';
import { AiPicksService, BacktestService, PortfolioService } from '@shared/services';
import { Stock } from '@shared/stock.interface';
import { PotentialTrade, Strategy } from './potential-trade.constant';
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
        const optionsChain = optionsData.optionsChain.monthlyStrategyList;
        const instruments = await this.portfolioService.getInstrument(symbol).toPromise();
        const callsCount = optionsData.strategy.secondaryLeg.totalVolume;
        const putsCount = optionsData.strategy.primaryLeg.totalVolume;
        const optionsVolume = Number(callsCount) + Number(putsCount);
        let latestMlResult = await this.aiPicksService.trainAndActivate(symbol);

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
          ml: latestMlResult ? latestMlResult.value : null,
          impliedMovement: optionsData.move,
          optionsVolume: optionsVolume,
          marketCap: instruments[symbol].fundamental.marketCap,
          strongbuySignals: [],
          buySignals: buySignals,
          strongsellSignals: [],
          sellSignals: sellSignals,
          high52: instruments[symbol].fundamental.high52,
          backtestDate: moment().format(),
          optionsChainLength: optionsChain.length
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
    if (newPairValue) {
      if (storage) {
        if (!Array.isArray(storage[symbol])) {
          storage[symbol] = [];
        }
        const findIdx = storage[symbol].findIndex(pairVal => pairVal ? pairVal.symbol === newPairValue.symbol : false);
        if (findIdx > -1) {
          storage[symbol][findIdx] = newPairValue;
        } else {
          storage[symbol].push(newPairValue)
        }
        localStorage.setItem('tradingPairs', JSON.stringify(storage));
      } else {
        const newStorageObj = {};
        newStorageObj[symbol] = [newPairValue];
        localStorage.setItem('tradingPairs', JSON.stringify(newStorageObj));
      }
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
    }
  }

  getCorrelationAndAdd(symbol: string, orderHistory: any[], targetSymbol: string, targetHistory: any[]) {
    const corr = this.getPairCorrelation(orderHistory, targetHistory);
    if (corr && corr > 0.4) {
      this.addPair(symbol, { symbol: targetSymbol, correlation: corr });
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

  sanitizeData() {
    const backtestData = this.getStorage('backtest');
    const newBacktestData = {};
    for (const b in backtestData) {
      if (!backtestData[b].backtestDate || moment().diff(moment(backtestData[b].backtestDate), 'days') < 7) {
        newBacktestData[b] = backtestData[b];
        this.findPair(backtestData[b].stock);
      }
    }
    localStorage.setItem('backtest', JSON.stringify(newBacktestData));
    return newBacktestData;
  }

  findTrades() {
    const backtests = this.sanitizeData();
    const tradingPairs = JSON.parse(localStorage.getItem('tradingPairs'));
    for (const key in tradingPairs) {
      const pairs = tradingPairs[key];
      const bObj = backtests[key];
      if (bObj.ml !== null) {
        if ((!bObj.optionsChainLength || bObj.optionsChainLength > 10) && (bObj.buySignals.length + bObj.sellSignals.length) > 0 || bObj.recommendation.toLowerCase() !== 'indeterminant') {
          if (bObj.ml > 0.6) {
            for (const pairVal of pairs) {
              if (pairVal !== null && backtests[pairVal.symbol] && backtests[pairVal.symbol].ml !== null && (!backtests[pairVal.symbol].optionsChainLength || backtests[pairVal.symbol].optionsChainLength > 10)) {
                if (backtests[pairVal.symbol].ml < 0.4) {
                  const trade = {
                    name: `${bObj.stock} Pair trade`,
                    date: moment().format(),
                    type: 'pairTrade',
                    key: bObj.stock,
                    strategy: {
                      buy: [bObj.stock],
                      sell: [pairVal.symbol]
                    }
                  };
                  this.addTradingStrategy(trade);
                }
              }
            }
          }
        }
      }
    }
  }

  getTradingStrategies() {
    return JSON.parse(localStorage.getItem('tradingStrategy')) || [];
  }

  addTradingStrategy(trade: PotentialTrade) {
    const storage = this.getTradingStrategies();
    if (trade) {
      if (storage && Array.isArray(storage)) {
        const findIdx = storage.findIndex(str => str.key === trade.key && str.type === trade.type);
        if (findIdx > -1) {
          const buys = storage[findIdx].strategy.buy.reduce((acc, curr) => {
            if (!acc.buy.find(a => a === curr)) {
              acc.buy.push(curr);
            }
            return acc;
          }, { buy: trade.strategy.buy }).buy;

          const sells = storage[findIdx].strategy.sell.reduce((acc, curr) => {
            if (!acc.sell.find(a => a === curr)) {
              acc.sell.push(curr);
            }
            return acc;
          }, { sell: trade.strategy.sell }).sell;

          storage[findIdx].strategy.buy = buys;
          storage[findIdx].strategy.sell = sells;
        } else {
          storage.push(trade)
        }
        localStorage.setItem('tradingStrategy', JSON.stringify(storage));
      } else {
        const newStorageObj = [trade];
        localStorage.setItem('tradingStrategy', JSON.stringify(newStorageObj));
      }
    }
  }
}
