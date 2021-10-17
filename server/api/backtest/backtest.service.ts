import * as moment from 'moment';
import * as _ from 'lodash';
import * as RequestPromise from 'request-promise';
import * as json2csv from 'json2csv';
import * as fs from 'fs';
import * as path from 'path';

import QuoteService from '../quote/quote.service';
import ReversionService from '../mean-reversion/reversion.service';
import DecisionService from '../mean-reversion/reversion-decision.service';
import BaseErrors from '../../components/errors/baseErrors';
import * as tulind from 'tulind';
import * as configurations from '../../config/environment';
import AlgoService from './algo.service';
import MfiService from './mfi.service';
import PortfolioService from '../portfolio/portfolio.service';

const dataServiceUrl = configurations.apps.goliath;
const mlServiceUrl = configurations.apps.armadillo;

const config = {
  shortTerm: [5, 110],
  longTerm: [10, 290]
};

export interface DaytradeParameters {
  mfiRange?: number[];
  bbandPeriod?: number;
  lossThreshold?: number;
  profitThreshold?: number;
  minQuotes: number;
}

export interface Indicators {
  vwma: number;
  mfiLeft: number;
  bband80: any[];
  mfiPrevious?: number;
  macd?: any;
  roc10?: number;
  roc10Previous?: number;
  roc70?: number;
  roc70Previous?: number;
  close?: number;
  recommendation?: Recommendation;
  action?: string;
  date?: string;
  demark9?: any;
  mfiLow?: number;
  high?: number;
  low?: number;
  mfiTrend?: boolean;
  macdPrevious?: any;
}

export interface DaytradeAlgos {
  mfi?: string;
  bband?: string;
  momentum?: string;
}

export interface Recommendation {
  recommendation: OrderType;
  mfi?: DaytradeRecommendation;
  roc?: DaytradeRecommendation;
  bband?: DaytradeRecommendation;
  vwma?: DaytradeRecommendation;
  mfiTrade?: DaytradeRecommendation;
  macd?: DaytradeRecommendation;
  demark9?: DaytradeRecommendation;
  mfiLow?: DaytradeRecommendation;
  mfiDivergence?: DaytradeRecommendation;
  overboughtMomentum?: DaytradeRecommendation;
}

export enum DaytradeRecommendation {
  Bullish = 'Bullish',
  Bearish = 'Bearish',
  Neutral = 'Neutral'
}

export enum OrderType {
  Buy = 'Buy',
  Sell = 'Sell',
  None = 'None'
}

export interface BacktestResults {
  algo: string;
  recommendation?: string;
  orderHistory: any[];
  net: number;
  total: number;
  signals?: Indicators[];
  totalTrades: number;
  invested?: number;
  returns: number;
  lastVolume?: number;
  lastPrice?: number;
  startDate?: number;
  endDate?: number;
  upperResistance?: number;
  lowerResistance?: number;
}

let startTime;
let endTime;

class BacktestService {
  getIndicator() {
    return tulind.indicators;
  }

  getBBands(real, period, stddev) {
    return tulind.indicators.bbands.indicator([real], [period, stddev]);
  }

  getSMA(real, period) {
    return tulind.indicators.sma.indicator([real], [period]);
  }

  getRateOfChange(real, period) {
    return tulind.indicators.roc.indicator([real], [period]);
  }

  getVwma(close, volume, period) {
    return tulind.indicators.vwma.indicator([close, volume], [period]);
  }

  getMacd(real, shortPeriod, longPeriod, signalPeriod) {
    return tulind.indicators.macd.indicator([real], [shortPeriod, longPeriod, signalPeriod]);
  }

  getRsi(real, period) {
    return tulind.indicators.rsi.indicator([real], [period]);
  }

  getDemark9(close, high, low) {
    let perfectSell = true;
    let perfectBuy = true;
    for (let i = 4; i < 10; i++) {
      if (perfectSell) {
        if (close[i] < close[i - 4]) {
          perfectSell = false;
        }
      }
      if (perfectBuy) {
        if (close[i] > close[i - 4]) {
          perfectBuy = false;
        }
      }
    }

    if (perfectSell) {
      if ((high[11] < high[10] || high[11] < high[9]) || close[12] < close[8]) {
        perfectSell = false;
      }
    }
    if (perfectBuy) {
      if ((low[11] > low[10] || low[11] > low[9]) || close[12] > close[8]) {
        perfectBuy = false;
      }
    }
    return { perfectSell, perfectBuy };
  }

  getCurrentDaytradeIndicators(symbol, period): Promise<Indicators> {
    const getIndicatorQuotes = [];

    return PortfolioService.getIntradayV2(symbol, 1)
      .then((intradayObj) => {
        const quotes = intradayObj.candles;
        _.forEach(quotes, (value, key) => {
          const idx = Number(key);
          if (idx > period) {
            const q = quotes.slice(idx - period, idx);
            getIndicatorQuotes.push(this.initStrategy(q));
          }
        });
        return Promise.all(getIndicatorQuotes)
          .then((indicators: Indicators[]) => {
            indicators = this.addOnDaytradeIndicators(indicators);
            return indicators[indicators.length - 1];
          });
      });
  }

  addOnDaytradeIndicators(indicators: Indicators[]) {
    let isMfiLowIdx = -1;
    let isMfiHighIdx = -1;
    let macdBuyIdx = -1;
    let macdSellIdx = -1;
    _.forEach(indicators, (indicator, idx) => {
      if (idx > 80) {
        const mfi = AlgoService.checkMfi(indicator.mfiLeft);
        const macd = AlgoService.checkMacdDaytrade(indicator.macd, indicator.macdPrevious);
        if (mfi === DaytradeRecommendation.Bullish) {
          isMfiLowIdx = idx;
        } else if (mfi === DaytradeRecommendation.Bearish) {
          isMfiHighIdx = idx;
        } else if (isMfiLowIdx > -1 && (idx - isMfiLowIdx) < 5 &&
          (macd === DaytradeRecommendation.Bullish || (idx - macdBuyIdx) < 3)) {
          indicators[idx].mfiTrend = true;
        } else if (isMfiHighIdx > -1 && (idx - isMfiHighIdx) < 5 &&
          (macd === DaytradeRecommendation.Bearish || (idx - macdSellIdx) < 3)) {
          indicators[idx].mfiTrend = false;
        } else if (macd === DaytradeRecommendation.Bullish) {
          macdBuyIdx = idx;
        } else if (macd === DaytradeRecommendation.Bearish) {
          macdSellIdx = idx;
        }
      }
    });
    return indicators;
  }

  evaluateStrategyAll(ticker, end, start) {
    console.log('Executing: ', ticker, new Date());
    startTime = moment();
    this.runTest(ticker, end, start);
  }

  evaluateIntradayAlgo(ticker, end, start) {
    return this.runIntradayEvaluation(ticker, end, start);
  }

  intradayTest(ticker, end, start) {
    console.log('Executing: ', ticker, new Date());
    startTime = moment();
    return this.runIntradayTest(ticker, end, start);
  }

  getDateRanges(currentDate, startDate) {
    const current = moment(currentDate),
      start = moment(startDate);

    const days = current.diff(start, 'days') + 1;

    return {
      end: current.format(),
      start: start.subtract(this.getTradeDays(days), 'days').format()
    };
  }

  getData(ticker, currentDate, startDate) {
    const { end, start } = this.getDateRanges(currentDate, startDate);

    return QuoteService.getDailyQuotes(ticker, end, start)
      .then(data => {
        return data;
      });
  }

  writeCsv(name, startDate, currentDate, rows, fields, count) {
    fs.writeFile(path.join(__dirname, '../../../tmp/' +
      `${name}_analysis_${startDate}-${currentDate}_${++count}.csv`
    ), json2csv({ data: rows, fields: fields }), function (err) {
      if (err) { throw err; }
      console.log('file saved');
    });
    return count;
  }

  runTest(ticker, currentDate, startDate) {
    const shortTerm = config.shortTerm;
    const longTerm = config.longTerm;
    const snapshots = [];
    return this.getData(ticker, currentDate, startDate)
      .then(quotes => {
        const fields = ['shortTerm', 'longTerm', 'totalReturns', 'totalTrades', 'recommendedDifference'];
        for (let i = shortTerm[0]; i < shortTerm[1]; i++) {
          for (let j = longTerm[0]; j < longTerm[1]; j++) {
            if (i + 3 < j) {
              const MAs = ReversionService.executeMeanReversion(ReversionService.calcMA, quotes, i, j);
              const recommendedDifference = 0.003;

              const averagesRange = { shortTerm: i, longTerm: j };
              const returns = DecisionService.calcReturns(MAs, recommendedDifference, startDate);

              if (returns.totalReturns > 0 && returns.totalTrades > 3) {
                snapshots.push({ ...averagesRange, ...returns, recommendedDifference });
              }

              snapshots.push({ ...averagesRange, ...returns, recommendedDifference });
            }
          }
        }
        console.log('Calculations done: ', ticker, new Date());
        endTime = moment();

        const duration = moment.duration(endTime.diff(startTime)).humanize();

        console.log('Duration: ', duration);

        fs.writeFile(`${ticker}_analysis_${startDate}-${currentDate}.csv`,
          json2csv({ data: snapshots, fields: fields }), function (err) {
            if (err) { throw err; }
            console.log('file saved');
          });
        return snapshots;
      });
  }

  runDaytradeBacktest(symbol, currentDate, startDate, parameters) {
    return this.initDaytradeStrategy(symbol, startDate, currentDate, parameters)
      .then(indicators => {
        const testResults = this.backtestDaytradingIndicators(this.getDaytradeRecommendation,
          indicators,
          parameters);

        return testResults;
      });
  }

  backtestDaytradingIndicators(recommendationFn: Function,
    indicators: Indicators[],
    parameters: DaytradeParameters): BacktestResults {
    let orders = {
      trades: 0,
      buy: [],
      history: [],
      net: 0,
      total: 0,
      profitableTrades: 0,
      returns: 0
    };

    _.forEach(indicators, (indicator, idx) => {
      if (indicator.close) {
        let orderType = OrderType.None;
        const avgPrice = this.estimateAverageBuyOrderPrice(orders);

        const isAtLimit = this.determineStopProfit(avgPrice, indicator.close,
          parameters.lossThreshold, parameters.profitThreshold);
        if (isAtLimit) {
          orderType = OrderType.Sell;
          indicator.recommendation = { recommendation: OrderType.Sell };
        } else {
          const recommendation: Recommendation = recommendationFn(indicator.close,
            indicator,
            idx > 0 ? indicators[idx - 1] : null);

          orderType = recommendation.recommendation;
          indicator.recommendation = recommendation;
        }
        orders = this.calcTrade(orders, indicator, orderType, avgPrice);
        indicator.action = this.getIndicatorAction(indicator.recommendation.recommendation);
      }
    });

    const ordersResults = {
      algo: '',
      orderHistory: orders.history,
      net: orders.net,
      returns: orders.returns,
      total: orders.total,
      invested: orders.total,
      profitableTrades: orders.profitableTrades,
      totalTrades: orders.trades
    };

    return {
      ...ordersResults,
      signals: indicators,
    };
  }

  getCurrentDaytrade(symbol: string, price: number, paidPrice: number, parameters, response) {
    return this.getCurrentDaytradeIndicators(symbol, parameters.minQuotes || 80)
      .then((currentIndicators: Indicators) => {

        let recommendation = {
          recommendation: OrderType.None
        };

        const avgPrice = paidPrice;

        const isAtLimit = this.determineStopProfit(avgPrice, price,
          parameters.lossThreshold, parameters.profitThreshold);
        if (isAtLimit) {
          recommendation.recommendation = OrderType.Sell;
        } else {

          if (!currentIndicators) {
            console.log('Missing indicator data: ', currentIndicators);
          }
          recommendation = this.getDaytradeRecommendation(currentIndicators.close, currentIndicators);
        }
        response.status(200).send(recommendation);
      });
  }

  getDaytradeRecommendation(price: number, indicator: Indicators): Recommendation {
    let counter = {
      bullishCounter: 0,
      bearishCounter: 0,
      neutralCounter: 0
    };

    const recommendations: Recommendation = {
      recommendation: OrderType.None,
      mfi: DaytradeRecommendation.Neutral,
      roc: DaytradeRecommendation.Neutral,
      bband: DaytradeRecommendation.Neutral,
      vwma: DaytradeRecommendation.Neutral,
      macd: DaytradeRecommendation.Neutral,
      demark9: DaytradeRecommendation.Neutral
    };

    const mfiRecommendation = AlgoService.checkMfi(indicator.mfiLeft);

    const rocMomentumRecommendation = AlgoService.checkRocMomentum(indicator.mfiPrevious, indicator.mfiLeft,
      indicator.roc10, indicator.roc10Previous,
      indicator.roc70, indicator.roc70Previous);

    const bbandRecommendation = AlgoService.checkBBand(price,
      AlgoService.getLowerBBand(indicator.bband80), AlgoService.getUpperBBand(indicator.bband80),
      indicator.mfiLeft);

    const vwmaRecommendation = AlgoService.checkVwma(price, indicator.vwma);

    const macdRecommendation = AlgoService.checkMacdDaytrade(indicator.macd, indicator.macdPrevious);

    const demark9Recommendation = AlgoService.checkDemark9(indicator.demark9);

    counter = AlgoService.countRecommendation(mfiRecommendation, counter);
    counter = AlgoService.countRecommendation(rocMomentumRecommendation, counter);
    counter = AlgoService.countRecommendation(bbandRecommendation, counter);
    counter = AlgoService.countRecommendation(macdRecommendation, counter);
    counter = AlgoService.countRecommendation(demark9Recommendation, counter);

    if (indicator.mfiTrend === true) {
      recommendations.recommendation = OrderType.Buy;
    } else if (indicator.mfiTrend === false) {
      recommendations.recommendation = OrderType.Sell;
    } else if (counter.bullishCounter > counter.bearishCounter && counter.bullishCounter > 2) {
      if (vwmaRecommendation !== DaytradeRecommendation.Bearish) {
        recommendations.recommendation = OrderType.Buy;
      } else {
        recommendations.recommendation = OrderType.None;
      }
    } else if (counter.bearishCounter > counter.bullishCounter && counter.bearishCounter > 2) {
      recommendations.recommendation = OrderType.Sell;
    }

    recommendations.mfi = mfiRecommendation;
    recommendations.roc = rocMomentumRecommendation;
    recommendations.bband = bbandRecommendation;
    recommendations.demark9 = demark9Recommendation;
    recommendations.macd = macdRecommendation;

    return recommendations;
  }

  getIndicatorAction(recommendation: string): string {
    if (recommendation === OrderType.None) {
      return 'INDETERMINANT';
    } if (recommendation === OrderType.Buy) {
      return 'STRONGBUY';
    } if (recommendation === OrderType.Sell) {
      return 'STRONGSELL';
    } else {
      return recommendation;
    }
  }

  backtestIndicators(recommendationFn: Function,
    indicators: Indicators[],
    parameters: DaytradeParameters): BacktestResults {
    let orders = {
      trades: 0,
      buy: [],
      history: [],
      net: 0,
      total: 0,
      profitableTrades: 0,
      returns: 0
    };

    let isMfiLowIdx = -1;
    let isMfiHighIdx = -1;

    _.forEach(indicators, (indicator, idx) => {
      if (indicator.close) {
        let orderType = OrderType.None;
        const avgPrice = this.estimateAverageBuyOrderPrice(orders);

        const isAtLimit = this.determineStopProfit(avgPrice, indicator.close,
          parameters.lossThreshold, parameters.profitThreshold);
        if (isAtLimit) {
          orderType = OrderType.Sell;
          indicator.recommendation = { recommendation: OrderType.Sell };
        } else {
          const recommendation: Recommendation = recommendationFn(indicator.close,
            indicator,
            idx > 0 ? indicators[idx - 1] : null);

          orderType = recommendation.recommendation;
          indicator.recommendation = recommendation;

          if (idx > 80) {
            if (indicator.recommendation.mfiLow === DaytradeRecommendation.Bullish ||
              indicator.recommendation.mfi === DaytradeRecommendation.Bullish) {
              isMfiLowIdx = idx;
            } else if (isMfiLowIdx > -1 && (idx - isMfiLowIdx) < 8 &&
              (indicator.recommendation.demark9 === DaytradeRecommendation.Bullish || indicator.recommendation.macd === DaytradeRecommendation.Bullish)) {
              indicator.recommendation.mfiTrade = DaytradeRecommendation.Bullish;
              indicator.recommendation.recommendation = OrderType.Buy;
            } else if (indicator.recommendation.mfi === DaytradeRecommendation.Bearish) {
              isMfiHighIdx = idx;
            } else if (isMfiHighIdx > -1 && (idx - isMfiHighIdx) < 8 &&
              (indicator.recommendation.demark9 === DaytradeRecommendation.Bearish || indicator.recommendation.macd === DaytradeRecommendation.Bearish)) {
              indicator.recommendation.mfiTrade = DaytradeRecommendation.Bearish;
              indicator.recommendation.recommendation = OrderType.Sell;
            }

            if ((indicator.recommendation.demark9 === DaytradeRecommendation.Bullish || indicator.recommendation.macd === DaytradeRecommendation.Bullish) &&
              Math.abs(indicators[idx - 5].mfiLeft - indicators[idx - 10].mfiLeft) < 3
            ) {
              indicator.recommendation.mfiDivergence = DaytradeRecommendation.Bullish;
              indicator.recommendation.recommendation = OrderType.Buy;
            } else if ((indicator.recommendation.demark9 === DaytradeRecommendation.Bearish || indicator.recommendation.macd === DaytradeRecommendation.Bearish) &&
              Math.abs(indicators[idx - 5].mfiLeft - indicators[idx - 10].mfiLeft) < 3) {
              indicator.recommendation.mfiDivergence = DaytradeRecommendation.Bearish;
              indicator.recommendation.recommendation = OrderType.Sell;
            }
          }
        }

        orders = this.calcTrade(orders, indicator, orderType, avgPrice);
        indicator.action = this.getIndicatorAction(indicator.recommendation.recommendation);
      }
    });

    const lastRecommendation = this.getIndicatorAction(indicators[indicators.length - 1].recommendation.recommendation);

    const ordersResults = {
      algo: '',
      orderHistory: orders.history,
      net: orders.net,
      returns: orders.returns,
      total: orders.total,
      invested: orders.total,
      profitableTrades: orders.profitableTrades,
      totalTrades: orders.trades,
      recommendation: lastRecommendation
    };

    return {
      ...ordersResults,
      signals: indicators,
    };
  }

  determineStopProfit(paidPrice, currentPrice, lossThreshold, profitThreshold) {
    if (!paidPrice || !currentPrice || !lossThreshold || !profitThreshold) {
      return false;
    }
    const gain = DecisionService.getPercentChange(currentPrice, paidPrice);
    if (gain < lossThreshold || gain > profitThreshold) {
      return true;
    }
  }


  runIntradayEvaluation(symbol, currentDate, startDate) {
    return this.initDaytradeStrategy(symbol, startDate, currentDate, { minQuotes: 81 })
      .then(indicators => {
        const bbRangeFn = (price, bband) => {
          const lower = bband[0][0];
          return price < lower;
        };

        const lossThreshold = 0.05;
        const profitThreshold = 0.05;
        const mfiRange = [20, 75];
        const fields = ['leftRange', 'rightRange', 'totalTrades', 'net', 'avgTrade', 'returns'];
        let count = 0;
        let leftRange = -1;
        let rightRange = 1;

        const rows = [];
        while (leftRange < 0) {
          while (rightRange > 0) {
            const rocDiffRange = [leftRange, rightRange];
            const results = this.getBacktestResults(this.getBuySignal,
              this.getSellSignal,
              indicators,
              bbRangeFn,
              mfiRange,
              rocDiffRange,
              lossThreshold,
              profitThreshold);

            const returns = _.round(_.divide(results.net, results.total), 3);
            if (returns > 0 && _.divide(indicators.length, results.trades) < 250) {
              rows.push({
                leftRange,
                rightRange,
                net: _.round(results.net, 3),
                avgTrade: _.round(_.divide(results.total, results.trades), 3),
                returns,
                totalTrades: results.trades
              });
            }
            if (rows.length > 500000) {
              this.writeCsv(name, startDate, currentDate, _.cloneDeep(rows), fields, ++count);
              rows.length = 0;
            }
            rightRange = _.round(_.subtract(rightRange, 0.1), 3);
          }
          leftRange = _.round(_.add(leftRange, 0.1), 3);
          rightRange = 0.9;
        }

        this.writeCsv(symbol, startDate, currentDate, rows, fields, count);
        return [];
      });
  }

  initDaytradeStrategy(symbol, startDate, currentDate, parameters): Promise<Indicators[]> {
    const minQuotes = parameters.minQuotes;
    const getIndicatorQuotes = [];

    return QuoteService.queryForIntraday(symbol, startDate, currentDate)
      .then(quotes => {
        if (quotes.length === 0) {
          console.log(`No quotes returned for ${startDate} - ${currentDate}`);
        }

        _.forEach(quotes, (value, key) => {
          const idx = Number(key);
          if (idx > minQuotes) {
            const q = quotes.slice(idx - minQuotes, idx);
            getIndicatorQuotes.push(this.initStrategy(q));
          }
        });
        return Promise.all(getIndicatorQuotes)
          .then((indicators: Indicators[]) => {
            return this.addOnDaytradeIndicators(indicators);
          });
      });
  }

  initDailyStrategy(symbol, currentDate, startDate, parameters = { minQuotes: 80 }) {
    const minQuotes = parameters.minQuotes;
    const getIndicatorQuotes = [];

    return this.getData(symbol, currentDate, startDate)
      .then(quotes => {
        console.log('Found quotes ', quotes[0].date, ' to ', quotes[quotes.length - 1].date);
        _.forEach(quotes, (value, key) => {
          if (value) {
            const idx = Number(key);

            if (idx > minQuotes) {
              if (moment(quotes[idx].date).format('YYYY MM DD') === moment(quotes[idx - 1].date).format('YYYY MM DD')) {
                console.log('Found duplicate ', quotes[idx].date, quotes[idx - 1].date);
                quotes.splice(idx - 1, 1);
              }
              const q = quotes.slice(idx - minQuotes, idx + 1);
              getIndicatorQuotes.push(this.initStrategy(q));
            }
          }
        });

        return Promise.all(getIndicatorQuotes);
      })
      .then((indicators: Indicators[]) => {
        let testResults;

        testResults = this.backtestIndicators(this.getAllRecommendations,
          indicators,
          parameters);

        testResults.algo = 'All indicators';

        return testResults;
      });
  }

  runIntradayTest(symbol, currentDate, startDate) {
    return this.initDaytradeStrategy(symbol, startDate, currentDate, { minQuotes: 81 })
      .then(indicators => {
        const bbRangeFn = (price, bband) => {
          const lower = bband[0][0];
          return price < lower;
        };
        const lossThreshold = 0.002;
        const profitThreshold = 0.003;
        const rocDiffRange = [-0.5, 0.5];
        const mfiRange = [20, 80];
        return this.getBacktestResults(this.getBuySignal,
          this.getSellSignal,
          indicators,
          bbRangeFn,
          mfiRange,
          rocDiffRange,
          lossThreshold,
          profitThreshold);
      });
  }

  evaluateBband(symbol, currentDate, startDate) {
    const minQuotes = 81;
    const getIndicatorQuotes = [];
    console.log('Start');

    return QuoteService.queryForIntraday(symbol, startDate, currentDate)
      .then(quotes => {
        console.log('quotes: ', quotes.length);
        _.forEach(quotes, (value, key) => {
          const idx = Number(key);
          if (idx > minQuotes) {
            const q = quotes.slice(idx - minQuotes, idx);
            getIndicatorQuotes.push(this.initMAIndicators(q));
          }
        });
        return Promise.all(getIndicatorQuotes);
      })
      .then(indicators => {
        const bbRangeFn = (price, bband) => {
          // const higher = bband[2][0];
          const lower = bband[0][0];

          return price < lower;
        };

        const lossThreshold = 0.05;
        const profitThreshold = 0.05;
        const fields = ['leftRange', 'rightRange', 'mfiLeft', 'mfiRight', 'totalTrades', 'net', 'avgTrade', 'returns'];
        let count = 0;
        const mfiLeft = 0;
        let mfiRight = 100;
        let leftRange = -1;
        let rightRange = 1;
        const rows = [];
        while (leftRange < -0.001) {
          rightRange = 0.9;
          while (rightRange > 0.001) {
            // mfiLeft = 0;
            // while (mfiLeft < 100) {
            mfiRight = 100;
            while (mfiRight > 0) {

              const mfiRange = [mfiLeft, mfiRight];

              const results = this.getBacktestResults(this.getMABuySignal,
                this.getMfiSellSignal,
                indicators,
                bbRangeFn,
                mfiRange,
                [leftRange, rightRange],
                lossThreshold,
                profitThreshold);

              if (results.net > 0 && _.divide(indicators.length, results.trades) < 250) {
                rows.push({
                  leftRange,
                  rightRange,
                  mfiLeft,
                  mfiRight,
                  net: _.round(results.net, 3),
                  avgTrade: _.round(_.divide(results.total, results.trades), 3),
                  returns: _.round(_.divide(results.net, results.total), 3),
                  totalTrades: results.trades
                });
              }

              if (rows.length > 500000) {
                this.writeCsv(`${symbol}-bband-intraday`, startDate, currentDate, _.cloneDeep(rows), fields, ++count);
                rows.length = 0;
              }

              mfiRight = _.subtract(mfiRight, 1);
            }
            //   mfiLeft = _.add(mfiLeft, 1);
            // }
            rightRange = _.round(_.subtract(rightRange, 0.01), 2);
          }
          leftRange = _.round(_.add(leftRange, 0.01), 2);
        }

        this.writeCsv(`${symbol}-bband-intraday`, startDate, currentDate, rows, fields, count);
        return [];
      });
  }

  evaluateDailyMfi(symbol, currentDate, startDate) {
    const minQuotes = 81;
    const getIndicatorQuotes = [];

    return this.getData(symbol, currentDate, startDate)
      .then(quotes => {
        console.log('quotes: ', quotes.length);
        _.forEach(quotes, (value, key) => {
          const idx = Number(key);
          if (idx > minQuotes) {
            const q = quotes.slice(idx - minQuotes, idx);
            getIndicatorQuotes.push(this.initMAIndicators(q));
          }
        });
        return Promise.all(getIndicatorQuotes);
      })
      .then(indicators => {
        const bbRangeFn = (price, bband) => {
          return null;
        };

        const testResult = [];
        const name = `${symbol}-mfi-daily`;
        const lossThreshold = 0.03;
        const profitThreshold = 0.05;
        const mfiRange = [20, 80];
        const fields = ['leftRange', 'rightRange', 'totalTrades', 'net', 'avgTrade', 'returns'];
        let count = 0;
        let leftRange = -0.9;
        let rightRange = 0.9;
        let bestResult = null;

        const rows = [];
        while (leftRange < 0) {
          while (rightRange > 0) {
            const rocDiffRange = [leftRange, rightRange];
            const results = this.getBacktestResults(this.getBuySignal,
              this.getSellSignal,
              indicators,
              bbRangeFn,
              mfiRange,
              rocDiffRange,
              lossThreshold,
              profitThreshold);

            if (results.net > 0) {
              const line = {
                leftRange,
                rightRange,
                net: _.round(results.net, 3),
                avgTrade: _.round(_.divide(results.total, results.trades), 3),
                returns: _.round(_.divide(results.net, results.total), 3),
                totalTrades: results.trades
              };

              rows.push(line);
              testResult.push(line);
              if (!bestResult || (line.returns > bestResult)) {
                bestResult = line;
              }
            }
            if (rows.length > 500000) {
              this.writeCsv(name, startDate, currentDate, _.cloneDeep(rows), fields, ++count);
              rows.length = 0;
            }
            rightRange = _.round(_.subtract(rightRange, 0.1), 3);
          }
          leftRange = _.round(_.add(leftRange, 0.1), 3);
          rightRange = 0.9;
        }


        // this.writeCsv(name, startDate, currentDate, rows, fields, count);
        let recommendation = 'INDETERMINANT';
        const lastInd = indicators[indicators.length - 1];
        if (bestResult) {
          // if (this.getBuySignal(indicators[indicators.length - 1],
          //     [0, 1], mfiRange, null)) {
          // [bestResult.leftRange, bestResult.rightRange], mfiRange, null)) {
          if (lastInd.mfiLeft < 20) {
            recommendation = 'BUY';
          } else if (lastInd.mfiLeft > 80) {
            recommendation = 'SELL';
          }
          testResult.push({ ...bestResult, algo: 'daily-mfi', recommendation, ...lastInd });
        }
        return testResult;
      });
  }

  getBacktestResults(buySignalFn: Function,
    sellSignalFn: Function,
    indicators,
    bbRangeFn,
    mfiRange,
    rocDiffRange,
    lossThreshold,
    profitThreshold) {
    let orders = {
      trades: 0,
      buy: [],
      history: [],
      net: 0,
      total: 0,
      returns: 0
    };

    _.forEach(indicators, (indicator) => {
      if (indicator.close) {
        let orderType;
        const avgPrice = this.estimateAverageBuyOrderPrice(orders);
        let sell = false,
          buy = false;
        if (orders.buy.length > 0) {
          sell = sellSignalFn(avgPrice,
            indicator.close,
            lossThreshold,
            profitThreshold,
            indicator,
            rocDiffRange,
            mfiRange);
        }

        buy = buySignalFn(indicator, rocDiffRange, mfiRange, bbRangeFn(indicator.close, indicator.bband80));

        if (buy) {
          orderType = 'buy';
        } else if (sell) {
          orderType = 'sell';
        }

        orders = this.calcTrade(orders, indicator, orderType, avgPrice);
      }
    });

    return { ...orders, indicators };
  }

  getBuySignal(indicator, rocDiffRange, mfiRange, bbCondition) {
    let num, den;
    if (indicator.roc70 > indicator.roc10) {
      num = indicator.roc70;
      den = indicator.roc10;
    } else {
      den = indicator.roc70;
      num = indicator.roc10;
    }

    const momentumDiff = _.round(_.divide(num, den), 3);

    // console.log('indicator: ', moment(indicator.date).format('HH:mm'), bbCondition, momentumDiff, indicator.mfiLeft)
    // if (bbCondition) {
    //   if (momentumDiff < rocDiffRange[0] || momentumDiff > rocDiffRange[1]) {
    //     if (indicator.mfiLeft < mfiLimit) {
    //       return true;
    //     }
    //   }
    // }
    if (momentumDiff < rocDiffRange[0] || momentumDiff > rocDiffRange[1]) {
      if (indicator.mfiLeft < mfiRange[0]) {
        return true;
      }
    }

    return false;
  }

  getSellSignal(paidPrice, currentPrice, lossThreshold, profitThreshold, indicator, rocDiffRange, mfiRange) {
    let num, den;
    if (indicator.roc70 > indicator.roc10) {
      num = indicator.roc70;
      den = indicator.roc10;
    } else {
      den = indicator.roc70;
      num = indicator.roc10;
    }

    const momentumDiff = _.round(_.divide(num, den), 3);
    const gain = DecisionService.getPercentChange(currentPrice, paidPrice);
    if (gain < lossThreshold || gain > profitThreshold) {
      return true;
    }

    const higher = indicator.bband80[0][2];

    if (currentPrice > higher) {
      if (momentumDiff < rocDiffRange[0] || momentumDiff > rocDiffRange[1]) {
        // if (indicator.mfiLeft > mfiRange[0] && indicator.mfiLeft < mfiRange[1]) {
        return true;
        // }
      }
    }
  }

  getMfiSellSignal(paidPrice, currentPrice, lossThreshold, profitThreshold, indicator, rocDiffRange, mfiRange) {
    // console.log(indicator.roc10, rocDiffRange[1], indicator.roc70, rocDiffRange[0]);
    const gain = DecisionService.getPercentChange(currentPrice, paidPrice);
    if (gain < lossThreshold || gain > profitThreshold) {
      return true;
    }

    const higher = indicator.bband80[0][2];
    if (indicator.roc10 < rocDiffRange[1] && indicator.roc70 < rocDiffRange[0]) {
      if (indicator.mfiLeft > 80 || (currentPrice > higher && indicator.mfiLeft > mfiRange[1])) {
        return true;
      }
    }
  }

  getMABuySignal(indicator: any, rocDiffRange, mfiRange: number[], bbCondition) {
    if (indicator.mfiLeft > mfiRange[0] && indicator.mfiLeft < mfiRange[1]) {
      // const crossover = _.round(DecisionService.calculatePercentDifference(indicator.sma5, indicator.sma70), 3);
      if (bbCondition) {
        let num, den;
        if (indicator.roc70 > indicator.roc10) {
          num = indicator.roc70;
          den = indicator.roc10;
        } else {
          den = indicator.roc70;
          num = indicator.roc10;
        }

        const momentumDiff = _.round(_.divide(num, den), 3);
        if (momentumDiff < rocDiffRange[0] || momentumDiff > rocDiffRange[1]) {
          return true;
        }
      }
    }

    return false;
  }

  calcTrade(orders, dayQuote, orderType, avgPrice) {
    if (orderType && orderType.toLowerCase() === 'sell') {
      if (orders.buy.length > 0) {
        orders.trades++;
        const len = orders.buy.length;
        const profit = (dayQuote.close - avgPrice) * len;
        if (profit > 0) {
          if (orders.profitableTrades) {
            orders.profitableTrades++;
          } else {
            orders.profitableTrades = 1;
          }
        }
        orders.total += (avgPrice * len);
        orders.net += profit;
        orders.returns += profit / (avgPrice * len);
        dayQuote.signal = 'sell';
        orders.history.push(dayQuote);
        orders.buy = [];
      }
    } else if (orderType && orderType.toLowerCase() === 'buy') {
      orders.buy.push(dayQuote.close);
      dayQuote.signal = 'buy';
      orders.history.push(dayQuote);
    }
    return orders;
  }

  estimateAverageBuyOrderPrice(orders) {
    return _.reduce(orders.buy, (sum, value) => {
      return sum + value;
    }, 0) / orders.buy.length;
  }

  getSubArray(reals, period) {
    return reals.slice(reals.length - (period + 1));
  }

  getSubArrayShift(reals, period, modifier) {
    const length = reals.length + modifier;
    return reals.slice(length - (period + 1), length);
  }

  processQuotes(quotes) {
    const reals = [],
      highs = [],
      lows = [],
      volumes = [],
      timeline = [];

    _.forEach(quotes, (value) => {
      if (value.close && value.high && value.low) {
        reals.push(value.close);
        highs.push(value.high);
        lows.push(value.low);
        volumes.push(value.volume);
        timeline.push(value.date);
      }
    });

    return { reals, highs, lows, volumes, timeline };
  }

  initStrategy(quotes) {
    const currentQuote = quotes[quotes.length - 1];
    const indicators = this.processQuotes(quotes);

    return this.getIndicators(indicators, 80, currentQuote);
  }

  getIndicators(indicators, bbandPeriod, returnObject) {
    const currentQuote = returnObject;
    return this.getBBands(indicators.reals, bbandPeriod, 2)
      .then((bband80) => {
        currentQuote.bband80 = bband80;
        const quotes10Day = this.getSubArray(indicators.reals, 24);
        return this.getRateOfChange(quotes10Day, 24);
      })
      .then((roc10) => {
        const rocLen = roc10[0].length - 1;
        currentQuote.roc10 = _.round(roc10[0][rocLen], 4);

        return this.getRateOfChange(this.getSubArrayShift(indicators.reals, 24, -1), 24);
      })
      .then((roc10Previous) => {
        const rocLen = roc10Previous[0].length - 1;
        currentQuote.roc10Previous = _.round(roc10Previous[0][rocLen], 4);

        return this.getRateOfChange(this.getSubArray(indicators.reals, 70), 70);
      })
      .then((roc70) => {
        const rocLen = roc70[0].length - 1;
        currentQuote.roc70 = _.round(roc70[0][rocLen], 4);

        return this.getRateOfChange(this.getSubArrayShift(indicators.reals, 70, -1), 70);
      })
      .then((roc70Previous) => {
        const rocLen = roc70Previous[0].length - 1;
        currentQuote.roc70Previous = _.round(roc70Previous[0][rocLen], 4);

        return MfiService.getMfi(this.getSubArray(indicators.highs, 14),
          this.getSubArray(indicators.lows, 14),
          this.getSubArray(indicators.reals, 14),
          this.getSubArray(indicators.volumes, 14),
          14);
      })
      .then((mfiLeft) => {
        const len = mfiLeft[0].length - 1;
        currentQuote.mfiLeft = _.round(mfiLeft[0][len], 3);
        return this.getVwma(this.getSubArray(indicators.reals, 70),
          this.getSubArray(indicators.volumes, 70), 70);
      })
      .then(vwma => {
        const vwmaLen = vwma[0].length - 1;
        currentQuote.vwma = _.round(vwma[0][vwmaLen], 3);
        return this.getMacd(indicators.reals, 12, 26, 9);
      })
      .then(macd => {
        currentQuote.macd = macd;
        return this.getMacd(indicators.reals.slice(0, indicators.reals.length - 1), 12, 26, 9);
      })
      .then(macdPrevious => {
        currentQuote.macdPrevious = macdPrevious;
        return this.getRsi(this.getSubArray(indicators.reals, 14), 14);
      })
      .then(rsi => {
        currentQuote.rsi = rsi;
        return this.getDemark9(this.getSubArray(indicators.reals, 13),
          this.getSubArray(indicators.highs, 13),
          this.getSubArray(indicators.lows, 13));
      })
      .then(demark9 => {
        currentQuote.demark9 = demark9;
        return MfiService.getMfiLow(indicators.highs,
          indicators.lows,
          indicators.reals,
          indicators.volumes,
          75);
      })
      .then(mfiLow => {
        currentQuote.mfiLow = mfiLow;
        return MfiService.getMfi(this.getSubArrayShift(indicators.highs, 14, -1),
          this.getSubArrayShift(indicators.lows, 14, -1),
          this.getSubArrayShift(indicators.reals, 14, -1),
          this.getSubArrayShift(indicators.volumes, 14, -1),
          14);
      })
      .then((mfiPrevious) => {
        const len = mfiPrevious[0].length - 1;
        currentQuote.mfiPrevious = _.round(mfiPrevious[0][len], 3);
        return currentQuote;
      })
      .catch(error => {
        console.log('Error creating indicators: ', error);
        return error;
      });
  }

  initMAIndicators(quotes) {
    const currentQuote = quotes[quotes.length - 1];
    const indicators = this.processQuotes(quotes);

    return this.getBBands(indicators.reals, 80, 2)
      .then((bband80) => {
        currentQuote.bband80 = bband80;
        //   return this.getSMA(indicators.reals, 5);
        // })
        // .then((sma5) => {
        //   currentQuote.sma5 = sma5[0][sma5[0].length - 1];
        //   return this.getSMA(indicators.reals, 70);
        // })
        // .then((sma70) => {
        //   currentQuote.sma70 = sma70[0][sma70[0].length - 1];
        return this.getRateOfChange(this.getSubArray(indicators.reals, 24), 24);
      })
      .then((roc10) => {
        const rocLen = roc10[0].length - 1;
        currentQuote.roc10 = _.round(roc10[0][rocLen], 3);
        return this.getRateOfChange(this.getSubArray(indicators.reals, 70), 70);
      })
      .then((roc70) => {
        const rocLen = roc70[0].length - 1;
        currentQuote.roc70 = _.round(roc70[0][rocLen], 3);
        //   return this.getRateOfChange(this.getSubArray(indicators.reals, 5), 5);
        // })
        // .then((roc5) => {
        //   const rocLen = roc5[0].length - 1;
        //   currentQuote.roc5 = _.round(roc5[0][rocLen], 3);
        return MfiService.getMfi(this.getSubArray(indicators.highs, 14),
          this.getSubArray(indicators.lows, 14),
          this.getSubArray(indicators.reals, 14),
          this.getSubArray(indicators.volumes, 14),
          14);
      })
      .then((mfiLeft) => {
        const len = mfiLeft[0].length - 1;
        currentQuote.mfiLeft = _.round(mfiLeft[0][len], 3);
        return currentQuote;
      });
  }

  getMeanReversionChart(ticker, currentDate, startDate, deviation, shortTerm, longTerm) {
    return this.getData(ticker, currentDate, startDate)
      .then(quotes => {
        return ReversionService.executeMeanReversion(ReversionService.calcMA, quotes, shortTerm, longTerm);
      })
      .catch(err => {
        console.log('ERROR! backtest', err);
        throw BaseErrors.InvalidArgumentsError();
      });
  }

  getTradeDays(days) {
    const workDaysPerWeek = 5 / 7,
      holidays = 9;

    return Math.ceil(days * workDaysPerWeek - holidays);
  }

  getInfoV2(symbol, endDate, startDate) {
    const to = moment(endDate).format('YYYY-MM-DD');
    const from = moment(startDate).format('YYYY-MM-DD');


    const query = `${dataServiceUrl}backtest/strategy/mean-reversion/train?` +
      `symbol=${symbol}&to=${to}&from=${from}` +
      `&s=30&l=90&d=0.03&p=80`;

    const options = {
      method: 'GET',
      uri: query
    };

    return RequestPromise(options)
      .then((data) => {
        const arr = JSON.parse(data);
        return arr;
      })
      .catch((error) => {
        console.log('Error: ', error);
      });
  }

  getInfoV2Chart(symbol, endDate, startDate) {
    const to = moment(endDate).format('YYYY-MM-DD');
    const from = moment(startDate).format('YYYY-MM-DD');

    console.log('to: ', to, ' from:', from);
    const query = `${dataServiceUrl}backtest/strategy/mean-reversion/chart?` +
      `symbol=${symbol}&to=${to}&from=${from}` +
      `&s=30&l=90&d=0.03&p=80`;

    const options = {
      method: 'GET',
      uri: query
    };

    return RequestPromise(options)
      .then((data) => {
        const arr = JSON.parse(data);
        return arr;
      })
      .catch((error) => {
        return error;
      });
  }

  getHistoricalMatches(symbol, endDate, startDate) {
    const to = moment(endDate).format('YYYY-MM-DD');
    const from = moment(startDate).format('YYYY-MM-DD');

    console.log('to: ', to, ' from:', from);
    const post = `${dataServiceUrl}backtest/train/find`;

    const options = {
      method: 'POST',
      uri: post,
      body: {
        symbol: symbol,
        to: to,
        from: from,
        save: false
      },
      json: true
    };

    return RequestPromise(options)
      .catch((error) => {
        console.log('Error: ', error);
      });
  }

  checkServiceStatus(serviceName) {
    let serviceUrl = '';
    switch (serviceName) {
      case 'data':
        serviceUrl = `${dataServiceUrl}actuator/health`;
        break;
      case 'ml':
        serviceUrl = `${mlServiceUrl}health`;
        break;
    }

    const options = {
      method: 'GET',
      uri: serviceUrl
    };

    return RequestPromise(options)
      .catch((error) => {
        console.log('Error: ', error);
      });
  }

  getTrainingData(symbol, endDate, startDate, useClosePrice = false) {
    const to = moment(endDate).format('YYYY-MM-DD');
    const from = moment(startDate).format('YYYY-MM-DD');

    console.log('to: ', to, ' from:', from);
    const url = `${configurations.apps.goliath}backtest/train`;

    const options = {
      method: 'GET',
      uri: url,
      qs: {
        ticker: symbol,
        to,
        from,
        save: false,
        useClosePrice
      },
    };

    return RequestPromise(options)
      .then(data => JSON.parse(data))
      .catch(error => {
        console.log('Error getTrainingData', error);
      });
  }

  runRNN(symbol, endDate, startDate, response) {
    const to = moment(endDate).format('YYYY-MM-DD');
    const from = moment(startDate).format('YYYY-MM-DD');

    const URI = `${mlServiceUrl}api?` +
      `symbol=${symbol}&to=${to}&from=${from}`;

    const options = {
      method: 'GET',
      uri: URI
    };

    RequestPromise(options)
      .catch((error) => {
        console.log('Error: ', error);
      });

    response.status(200).send();
  }

  activateRNN(symbol, startDate, response) {
    const today = moment(startDate).format('YYYY-MM-DD');
    const yesterday = moment(startDate).add(-1, 'days').format('YYYY-MM-DD');

    this.getTrainingData(symbol, today, yesterday)
      .then((trainingData) => {
        const URI = `${mlServiceUrl}api/activate`;

        const options = {
          method: 'POST',
          uri: URI,
          body: {
            symbol: 'SPY',
            input: trainingData[trainingData.length - 1].input,
            round: false,
            to: today
          },
          json: true
        };

        RequestPromise(options)
          .catch((error) => {
            console.log('Error: ', error);
          });
      });
    response.status(200).send();
  }

  checkRNNStatus(symbol, endDate, modelName) {
    const to = moment(endDate).format('YYYY-MM-DD');

    const URI = `${dataServiceUrl}precog/prediction?` +
      `symbol=${symbol}&date=${to}&modelName=${modelName}`;

    const options = {
      method: 'GET',
      uri: URI,
      json: true
    };

    return RequestPromise(options)
      .catch((error) => {
        console.log('Error: ', error.message);
      });
  }

  /*
  * {'symbol': 'SHAK',
  * 'to': '2019-11-01',
  * 'from':'2018-09-24',
  * 'settings': [0.03, 30, 90, 80],
  * 'strategy': 'MoneyFlowIndex'
  * }
  */
  bbandMfiInfo(symbol, endDate, startDate) {
    const to = moment(endDate).format('YYYY-MM-DD');
    const from = moment(startDate).format('YYYY-MM-DD');


    const query = `${dataServiceUrl}backtest/strategy`;

    const options = {
      method: 'POST',
      uri: query,
      body: {
        symbol,
        to,
        from,
        strategy: 'bbmfi'
      },
      json: true
    };

    return RequestPromise(options)
      .catch((error) => {
        console.log('Error: ', error);
      });
  }

  /*
  * {'symbol': 'SPY',
  * 'to': '2019-11-15',
  * 'from':'2018-01-24',
  * 'settings': [0.03, 30, 90, 80],
  * 'strategy': 'MOVINGAVERAGECROSSOVER'
  * }
  */
  getMovingAverageCrossOverInfo(symbol, endDate, startDate, settings) {
    const to = moment(endDate).format('YYYY-MM-DD');
    const from = moment(startDate).format('YYYY-MM-DD');

    const query = `${dataServiceUrl}backtest/strategy`;

    const options = {
      method: 'POST',
      uri: query,
      body: {
        symbol,
        to,
        from,
        strategy: 'MOVINGAVERAGECROSSOVER',
        settings
      },
      json: true
    };

    return RequestPromise(options)
      .catch((error) => {
        console.log('Error: ', error);
      });
  }

  /*
* {'symbol': 'SPY',
* 'to': '2019-11-15',
* 'from':'2018-01-24',
* 'settings': [0.03, 30, 90, 80],
* 'strategy': 'MOVINGAVERAGECROSSOVER'
* }
*/
  findResistance(symbol, endDate, startDate) {
    const to = moment(endDate).format('YYYY-MM-DD');
    const from = moment(startDate).format('YYYY-MM-DD');

    const query = `${dataServiceUrl}backtest/strategy`;

    const options = {
      method: 'POST',
      uri: query,
      body: {
        symbol,
        to,
        from,
        strategy: 'FINDRESISTANCE'
      },
      json: true
    };

    return RequestPromise(options)
      .catch((error) => {
        console.log('Error: ', error);
      });
  }

  getRocMfiTrend(quotes) {
    const currentQuote = quotes[quotes.length - 1];
    const indicators = this.processQuotes(quotes);

    const quotes10Day = this.getSubArray(indicators.reals, 24);
    return this.getRateOfChange(quotes10Day, 24)
      .then((roc10) => {
        const rocLen = roc10[0].length - 1;
        currentQuote.roc10 = _.round(roc10[0][rocLen], 4);

        return this.getRateOfChange(this.getSubArrayShift(indicators.reals, 24, -1), 24);
      })
      .then((roc10Previous) => {
        const rocLen = roc10Previous[0].length - 1;
        currentQuote.roc10Previous = _.round(roc10Previous[0][rocLen], 4);

        return this.getRateOfChange(this.getSubArray(indicators.reals, 70), 70);
      })
      .then((roc70) => {
        const rocLen = roc70[0].length - 1;
        currentQuote.roc70 = _.round(roc70[0][rocLen], 4);

        return this.getRateOfChange(this.getSubArrayShift(indicators.reals, 70, -1), 70);
      })
      .then((roc70Previous) => {
        const rocLen = roc70Previous[0].length - 1;
        currentQuote.roc70Previous = _.round(roc70Previous[0][rocLen], 4);

        return MfiService.getMfi(this.getSubArray(indicators.highs, 14),
          this.getSubArray(indicators.lows, 14),
          this.getSubArray(indicators.reals, 14),
          this.getSubArray(indicators.volumes, 14),
          14);
      })
      .then((mfiLeft) => {
        const len = mfiLeft[0].length - 1;
        currentQuote.mfiLeft = _.round(mfiLeft[0][len], 3);
        return MfiService.getMfi(this.getSubArrayShift(indicators.highs, 14, -10),
          this.getSubArrayShift(indicators.lows, 14, -10),
          this.getSubArrayShift(indicators.reals, 14, -10),
          this.getSubArrayShift(indicators.volumes, 14, -10),
          14);
      })
      .then((mfiPrevious) => {
        const len = mfiPrevious[0].length - 1;
        currentQuote.mfiPrevious = _.round(mfiPrevious[0][len], 3);
        return currentQuote;
      });
  }

  getMachineLearningIndicators(quotes) {
    const currentQuote = quotes[quotes.length - 1];
    const indicators = this.processQuotes(quotes);

    const quotes10Day = this.getSubArray(indicators.reals, 24);
    return this.getRateOfChange(quotes10Day, 24)
      .then((roc10) => {
        const rocLen = roc10[0].length - 1;
        currentQuote.roc10 = _.round(roc10[0][rocLen], 4);

        return this.getRateOfChange(this.getSubArrayShift(indicators.reals, 24, -1), 24);
      })
      .then((roc10Previous) => {
        const rocLen = roc10Previous[0].length - 1;
        currentQuote.roc10Previous = _.round(roc10Previous[0][rocLen], 4);

        return this.getRateOfChange(this.getSubArray(indicators.reals, 70), 70);
      })
      .then((roc70) => {
        const rocLen = roc70[0].length - 1;
        currentQuote.roc70 = _.round(roc70[0][rocLen], 4);

        return this.getRateOfChange(this.getSubArrayShift(indicators.reals, 70, -1), 70);
      })
      .then((roc70Previous) => {
        const rocLen = roc70Previous[0].length - 1;
        currentQuote.roc70Previous = _.round(roc70Previous[0][rocLen], 4);

        return MfiService.getMfi(this.getSubArray(indicators.highs, 14),
          this.getSubArray(indicators.lows, 14),
          this.getSubArray(indicators.reals, 14),
          this.getSubArray(indicators.volumes, 14),
          14);
      })
      .then((mfiLeft) => {
        const len = mfiLeft[0].length - 1;
        currentQuote.mfiLeft = _.round(mfiLeft[0][len], 3);
        return MfiService.getMfi(this.getSubArrayShift(indicators.highs, 14, -10),
          this.getSubArrayShift(indicators.lows, 14, -10),
          this.getSubArrayShift(indicators.reals, 14, -10),
          this.getSubArrayShift(indicators.volumes, 14, -10),
          14);
      })
      .then((mfiPrevious) => {
        const len = mfiPrevious[0].length - 1;
        currentQuote.mfiPrevious = _.round(mfiPrevious[0][len], 3);
        return currentQuote;
      });
  }

  getDailyRocRecommendation(price: number, indicator: Indicators): Recommendation {
    const recommendations: Recommendation = {
      recommendation: OrderType.None,
      mfi: DaytradeRecommendation.Neutral,
      roc: DaytradeRecommendation.Neutral,
      bband: DaytradeRecommendation.Neutral,
      vwma: DaytradeRecommendation.Neutral,
      mfiTrade: DaytradeRecommendation.Neutral
    };

    const rocCrossoverRecommendation = AlgoService.checkRocCrossover(indicator.roc70Previous, indicator.roc70, indicator.mfiLeft);

    const mfiTrendRecommendation = AlgoService.checkMfiTrend(indicator.mfiPrevious, indicator.mfiLeft, null, null);

    recommendations.roc = rocCrossoverRecommendation;
    recommendations.mfiTrade = mfiTrendRecommendation;

    if (recommendations.roc === DaytradeRecommendation.Bullish &&
      recommendations.mfiTrade === DaytradeRecommendation.Bullish) {
      recommendations.recommendation = OrderType.Buy;
    } else if (recommendations.roc === DaytradeRecommendation.Bearish &&
      recommendations.mfiTrade === DaytradeRecommendation.Bearish) {
      recommendations.recommendation = OrderType.Sell;
    }

    return recommendations;
  }

  getAllRecommendations(price: number, indicator: Indicators, previousIndicator: Indicators): Recommendation {
    const recommendations: Recommendation = {
      recommendation: OrderType.None,
      mfi: DaytradeRecommendation.Neutral,
      mfiLow: DaytradeRecommendation.Neutral,
      vwma: DaytradeRecommendation.Neutral,
      mfiTrade: DaytradeRecommendation.Neutral,
      macd: DaytradeRecommendation.Neutral,
      demark9: DaytradeRecommendation.Neutral,
      mfiDivergence: DaytradeRecommendation.Neutral
    };

    const rocCrossoverRecommendation = AlgoService.checkRocCrossover(indicator.roc70Previous, indicator.roc70, indicator.mfiLeft);

    const mfiRecommendation = AlgoService.checkMfi(indicator.mfiLeft);

    const macdRecommendation = AlgoService.checkMacd(indicator, previousIndicator);

    const demark9Recommendation = AlgoService.checkDemark9(indicator.demark9);

    const mfiLowRecommendation = AlgoService.checkMfiLow(indicator.mfiLow, indicator.mfiLeft);


    recommendations.roc = rocCrossoverRecommendation;
    recommendations.macd = macdRecommendation;
    recommendations.mfi = mfiRecommendation;
    recommendations.demark9 = demark9Recommendation;
    recommendations.mfiLow = mfiLowRecommendation;

    if (recommendations.demark9 === DaytradeRecommendation.Bullish ||
      recommendations.mfiTrade === DaytradeRecommendation.Bullish ||
      recommendations.macd === DaytradeRecommendation.Bullish) {
      recommendations.recommendation = OrderType.Buy;
    } else if (recommendations.demark9 === DaytradeRecommendation.Bearish ||
      recommendations.mfiTrade === DaytradeRecommendation.Bearish ||
      recommendations.macd === DaytradeRecommendation.Bearish) {
      recommendations.recommendation = OrderType.Sell;
    }

    return recommendations;
  }

  evaluateDailyRocMfiTrend(symbol, currentDate, startDate) {
    const getIndicatorQuotes = [];
    const minQuotes = 100;
    const parameters = {
      lossThreshold: null,
      profitThreshold: null,
      minQuotes: 81
    };
    return this.getData(symbol, currentDate, startDate)
      .then(quotes => {
        _.forEach(quotes, (value, key) => {
          const idx = Number(key);
          if (idx > minQuotes) {
            const q = quotes.slice(idx - minQuotes, idx);
            getIndicatorQuotes.push(this.getRocMfiTrend(q));
          }
        });
        return Promise.all(getIndicatorQuotes);
      })
      .then(indicators => {
        const testResults = this.backtestIndicators(this.getDailyRocRecommendation,
          indicators,
          parameters);

        testResults.algo = 'RocCrossover';
        return testResults;
      });
  }

  calibrateDaytrade(symbols, currentDate, startDate, response) {
    const quotesPromises = [];
    const parameters = {
      lossThreshold: 0.003,
      profitThreshold: 0.003,
      minQuotes: 81
    };

    for (const symbol of symbols) {
      quotesPromises.push(this.initDaytradeStrategy(symbol, startDate, currentDate, parameters));
    }

    Promise.all(quotesPromises).then(function (indicators) {
      response.status(200).send(indicators);
    });
  }

  trainV2Model(symbol, endDate, startDate, trainingSize) {
    const to = moment(endDate).format('YYYY-MM-DD');
    const from = moment(startDate).format('YYYY-MM-DD');
    console.log('from - to: ', from, to);

    const URI = `${mlServiceUrl}api/test-model?`;

    const options = {
      method: 'GET',
      uri: URI,
      qs: {
        symbol,
        to,
        from,
        trainingSize
      }
    };

    return RequestPromise(options)
      .catch((error) => {
        console.log('Error: ', error);
      });
  }

  trainCustomModel(symbol, modelName, trainingData, trainingSize, date) {
    const URI = `${mlServiceUrl}api/train-custom`;

    const options = {
      method: 'POST',
      uri: URI,
      body: {
        symbol,
        modelName,
        trainingData,
        trainingSize,
        to: date
      },
      json: true
    };
    console.log('model name: ', modelName);
    return RequestPromise(options)
      .catch((error) => {
        console.log('train-custom error: ', error.message);
      });
  }

  trainTensorModel(symbol, modelName, trainingData, trainingSize, date) {
    const URI = `${mlServiceUrl}api/tensor/train-model`;

    const options = {
      method: 'POST',
      uri: URI,
      body: {
        symbol,
        modelName,
        trainingData,
        trainingSize,
        to: date
      },
      json: true
    };

    return RequestPromise(options)
      .catch((error) => {
        console.log('train-custom error: ', error.message);
      });
  }

  activateTensorModel(symbol, modelName, trainingData, trainingSize, date) {
    const URI = `${mlServiceUrl}api/tensor/train-model`;

    const options = {
      method: 'POST',
      uri: URI,
      body: {
        symbol,
        modelName,
        trainingData,
        trainingSize,
        to: date,
        scoreOnly: true
      },
      json: true
    };

    return RequestPromise(options)
      .catch((error) => {
        console.log('train-custom error: ', error.message);
      });
  }

  activateV2Model(symbol, startDate, trainingData) {
    const today = moment(startDate).format('YYYY-MM-DD');

    const URI = `${mlServiceUrl}api/v2/activate`;

    const options = {
      method: 'POST',
      uri: URI,
      body: {
        symbol,
        input: trainingData[trainingData.length - 1].input,
        round: false,
        to: today
      },
      json: true
    };

    return RequestPromise(options)
      .catch((error) => {
        console.log('Error: ', error);
      });
  }

  activateCustomModel(symbol, modelName: string, input, to) {
    const URI = `${mlServiceUrl}api/activate-custom`;

    const options = {
      method: 'POST',
      uri: URI,
      body: {
        symbol,
        modelName,
        input,
        to,
        round: false
      },
      json: true
    };

    return RequestPromise(options)
      .catch((error) => {
        console.log('Error: ', error);
      });
  }
}

export default new BacktestService();
