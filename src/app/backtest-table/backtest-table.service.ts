import { Injectable } from '@angular/core';
import { OptionsDataService } from '@shared/options-data.service';
import { AiPicksService, BacktestService, CartService, PortfolioService } from '@shared/services';
import { Stock } from '@shared/stock.interface';
import { PotentialTrade, Strategy } from './potential-trade.constant';
import * as moment from 'moment-timezone';
import { Strangle } from '@shared/models/options';
import { OrderTypes } from '@shared/models/smart-order';

@Injectable({
  providedIn: 'root'
})
export class BacktestTableService {
  orderHistory = {};
  correlationThreshold = 0.5;

  constructor(private backtestService: BacktestService,
    private aiPicksService: AiPicksService,
    private optionsDataService: OptionsDataService,
    private portfolioService: PortfolioService,
    private cartService: CartService) { }

  async getBacktestData(symbol: string) {
    const current = moment().format('YYYY-MM-DD');
    const start = moment().subtract(365, 'days').format('YYYY-MM-DD');

    try {
      const indicatorResults = await this.backtestService.getBacktestEvaluation(symbol, start, current, 'daily-indicators').toPromise();
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

      if (buySignals.length + sellSignals.length > 1) {
        const optionsData = await this.optionsDataService.getImpliedMove(symbol, '5').toPromise();
        const optionsChain = optionsData.optionsChain.monthlyStrategyList;
        const instruments = await this.portfolioService.getInstrument(symbol).toPromise();
        const callsCount = optionsData.optionsChain.monthlyStrategyList[0].optionStrategyList[0].secondaryLeg.totalVolume;
        const putsCount = optionsData.optionsChain.monthlyStrategyList[0].optionStrategyList[0].primaryLeg.totalVolume;
        const optionsVolume = Number(callsCount) + Number(putsCount);
        let latestMlResult = null;
        try {
          latestMlResult = await this.aiPicksService.trainAndActivate(symbol);
        } catch(error) {
          console.log('Error training', error);
          latestMlResult = await this.aiPicksService.trainAndActivate(symbol);
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
          ml: latestMlResult,
          impliedMovement: optionsData.move,
          optionsVolume: optionsVolume,
          marketCap: instruments[symbol]?.fundamental.marketCap,
          strongbuySignals: [],
          buySignals: buySignals,
          strongsellSignals: [],
          sellSignals: sellSignals,
          high52: instruments[symbol]?.fundamental.high52,
          backtestDate: moment().format(),
          optionsChainLength: optionsChain.length
        };

        this.addToResultStorage(tableObj);
        return tableObj;
      }
    } catch (error) {
      console.log(`Backtest table error ${symbol}`, new Date().toString(), error);
    }
    return null;
  }

  isPutHedge(goal: number, strike: number, impliedMovement: number) {
    if (strike < goal) {
      const diff = ((goal - strike) / goal);
      if (diff > (impliedMovement * -1)) {
        return true;
      }
    }

    return false;
  }

  isCallHedge(goal: number, strike: number, impliedMovement: number) {
    if (strike > goal) {
      const diff = ((strike - goal) / goal);
      if (diff < impliedMovement) {
        return true;
      }
    }

    return false;
  }

  passesVolumeCheck(currTotalVolume, prevObj) {
    return !prevObj || (currTotalVolume > prevObj.totalVolume);
  }

  async getCallTrade(symbol: string): Promise<Strangle> {
    console.log('getting call trade');
    const minExpiration = 65;
    const optionsData = await this.optionsDataService.getImpliedMove(symbol).toPromise();
    const optionsChain = optionsData.optionsChain;
    const impliedMovement = optionsData.move;
    const strategyList = optionsChain.monthlyStrategyList.find(element => element.daysToExp >= minExpiration);
    const goal = optionsChain.underlying.last;

    return strategyList.optionStrategyList.reduce((prev, curr) => {
      if (!prev.call || (Math.abs(Number(curr.strategyStrike - goal)) < Math.abs(Number(prev.call.strikePrice) - goal))) {
        if (curr.secondaryLeg.putCallInd.toLowerCase() === 'c') {
          prev.call = JSON.parse(JSON.stringify(curr.secondaryLeg));
        }
      }

      if ((!prev.put && curr.strategyStrike < goal) ||
        (this.isPutHedge(goal, curr.strategyStrike, impliedMovement) && this.passesVolumeCheck(curr.primaryLeg.totalVolume, prev.put))) {
        if (curr.primaryLeg.putCallInd.toLowerCase() === 'p') {
          prev.put = JSON.parse(JSON.stringify(curr.primaryLeg));
        }
      }
      return prev;
    }, { call: null, put: null });
  }

  async getPutTrade(symbol: string) {
    console.log('getting put trade');
    const minExpiration = 65;
    const optionsData = await this.optionsDataService.getImpliedMove(symbol).toPromise();
    const optionsChain = optionsData.optionsChain;
    const impliedMovement = optionsData.move;

    const strategyList = optionsChain.monthlyStrategyList.find(element => element.daysToExp >= minExpiration);
    const goal = optionsChain.underlying.last;

    return strategyList.optionStrategyList.reduce((prev, curr) => {
      if ((!prev.call && curr.strategyStrike > goal) ||
        (this.isCallHedge(goal, curr.strategyStrike, impliedMovement) && this.passesVolumeCheck(curr.secondaryLeg.totalVolume, prev.call))) {
        if (curr.secondaryLeg.putCallInd.toLowerCase() === 'c') {
          prev.call = JSON.parse(JSON.stringify(curr.secondaryLeg));
        }
      }
      if (!prev.put || (Math.abs(curr.strategyStrike - goal) < Math.abs(Number(prev.put.strikePrice) - goal))) {
        if (curr.primaryLeg.putCallInd.toLowerCase() === 'p') {
          prev.put = JSON.parse(JSON.stringify(curr.primaryLeg));
        }
      }
      return prev;
    }, { call: null, put: null });
  }

  findOptionsPrice(bid: number, ask: number): number {
    return Number(((bid + ask)/2).toFixed(1) + '0');
  }

  addToResultStorage(result: Stock) {
    this.addToStorage('backtest', result.stock, result);
  }

  addToOrderHistoryStorage(symbol: string, tradingHistory: any[]) {
    this.orderHistory[symbol] = tradingHistory;
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
    const orderHistory = this.orderHistory[symbol];
    if (orderHistory) {
      for (const h in this.orderHistory) {
        if (h !== symbol) {
          const targetHistory = this.orderHistory[h];
          this.getCorrelationAndAdd(symbol, orderHistory, h, targetHistory);
        }
      }
    }
  }

  getCorrelationAndAdd(symbol: string, orderHistory: any[], targetSymbol: string, targetHistory: any[]) {
    const corr = this.getPairCorrelation(orderHistory, targetHistory);
    if (corr && corr > this.correlationThreshold) {
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
      if (Math.abs(moment(primaryDate).diff(moment(targetDate), 'day')) < 9) {
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
      if (!backtestData[b].backtestDate || moment().diff(moment(backtestData[b].backtestDate), 'days') < 4) {
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
      if (bObj !== undefined && bObj !== null && bObj.ml !== null) {
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

  setTradingStrategies(strats: PotentialTrade[]) {
    localStorage.setItem('tradingStrategy', JSON.stringify(strats));
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

  removeTradingStrategy(trade: PotentialTrade) {
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

  async addStrangle(symbol: string, price: number, optionStrategy: Strangle) {
    // const balance: any = await this.portfolioService.getTdBalance().toPromise();
    const quantity = Math.floor(1000/(price * 100)) | 1;
    const order = {
      holding: {
        instrument: null,
        symbol: symbol.toUpperCase(),
      },
      quantity: quantity,
      price,
      submitted: false,
      pending: false,
      orderSize: 1,
      side: 'Buy',
      lossThreshold: -0.05,
      profitTarget: 0.1,
      trailingStop: -0.05,
      useStopLoss: true,
      useTrailingStopLoss: true,
      useTakeProfit: true,
      sellAtClose: false,
      allocation: 0.05,
      primaryLeg: optionStrategy.call,
      secondaryLeg: optionStrategy.put,
      type: OrderTypes.options
    };

    this.cartService.addToCart(order);
  }
}
