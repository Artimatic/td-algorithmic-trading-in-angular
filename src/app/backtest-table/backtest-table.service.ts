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
      const indicatorResults = await this.backtestService.getBacktestEvaluation(symbol, start, current, 'daily-indicators').toPromise();
      indicatorResults.stock = symbol;

      const lastSignal = indicatorResults.signals[indicatorResults.signals.length - 1];

      const optionsData = await this.optionsDataService.getImpliedMove(symbol).toPromise();
      const instruments = await this.portfolioService.getInstrument(symbol).toPromise();
      const callsCount = optionsData.strategy.secondaryLeg.totalVolume;
      const putsCount = optionsData.strategy.primaryLeg.totalVolume;
      const optionsVolume = Number(callsCount) + Number(putsCount);
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
        ml: null,
        impliedMovement: optionsData.move,
        optionsVolume: optionsVolume,
        marketCap: instruments[symbol].fundamental.marketCap,
        strongbuySignals: [],
        buySignals: [],
        strongsellSignals: [],
        sellSignals: [],
        high52: instruments[symbol].fundamental.high52
      };
      const latestMlResult = await this.aiPicksService.trainAndActivate(symbol);
      if (latestMlResult) {
        tableObj.ml = latestMlResult.value;
      }

      for (const indicator in lastSignal.recommendation) {
        if (lastSignal.recommendation.hasOwnProperty(indicator)) {
          if (lastSignal.recommendation[indicator] === 'Bullish') {
            tableObj.buySignals.push(indicator);
          } else if (lastSignal.recommendation[indicator] === 'Bearish') {
            tableObj.sellSignals.push(indicator);
          }
        }
      }

    this.addToResultStorage(tableObj);
    return tableObj;
    } catch (error) {
      console.log(error);
    }
    return null;
  }

  addToResultStorage(result: Stock) {
    const backtestStorage = JSON.parse(localStorage.getItem('backtest'));
    const key = result.stock;
    if (backtestStorage) {
      backtestStorage[key] = result;
      localStorage.setItem('backtest', JSON.stringify(backtestStorage));
    } else {
      const newStorageObj = {};
      newStorageObj[key] = result;
      localStorage.setItem('backtest', JSON.stringify(newStorageObj));
    }
  }
}
