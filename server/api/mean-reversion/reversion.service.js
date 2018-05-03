const moment = require('moment');
const algebra = require("algebra.js");
const math = require("mathjs");
import {
  ma, dma, ema, sma, wma
} from 'moving-averages';

import * as errors from '../../components/errors/baseErrors';
import { QuoteService } from './../quote/quote.service';
import { BacktestService } from './../backtest/backtest.service';

const DecisionService = require('./reversion-decision.service');

const Fraction = algebra.Fraction;
const Expression = algebra.Expression;
const Equation = algebra.Equation;

const algorithms = {
  MeanReversion_30_90: "0"
};

class ReversionService {
  getTrend(quotes, end, thirtyDay, ninetyDay, deviation) {
    let trend = DecisionService.getInitialTrend(quotes, end, deviation);
    trend = DecisionService.getTrendLogic(quotes[end], thirtyDay, ninetyDay, trend, deviation);
    return trend;
  }

  getData(ticker, currentDate, startDate) {
    let { to, from } = this.getDateRanges(currentDate, startDate);
    return QuoteService.getDailyQuotes(ticker, to, from)
      .then(data => {
        return data;
      });
  }

  getPrice(ticker, currentDate, deviation) {
    let quotes = null,
      decisions = null;

    let { endDate, start } = this.getDateRanges();

    if (isNaN(deviation)) {
      throw errors.InvalidArgumentsError();
    }

    return QuoteService.getData(ticker, start, endDate)
      .then(data => {
        if (data.length === 0) {
          throw errors.InvalidArgumentsError();
        }
        quotes = data;
        return data;
      })
      .then(this.getDecisionData)
      .then(data => {
        decisions = data;
        return this.calcPricing(quotes, quotes.length - 1, data.thirtyTotal, data.ninetyTotal, deviation);
      })
      .then(price => {
        let trend1 = this.getTrend(quotes, quotes.length - 1, price.lower.thirtyAvg, price.lower.ninetyAvg);
        let trend2 = this.getTrend(quotes, quotes.length - 1, price.upper.thirtyAvg, price.upper.ninetyAvg);
        price.lower.trend = trend1;
        price.upper.trend = trend2;
        return price;
      })
      .catch(err => {
        console.log('ERROR! pricing', err);
        throw errors.InvalidArgumentsError();
      });
  }

  getDateRanges(to, from) {
    return {
      to: moment(to).format(),
      from: moment(from).subtract(118, 'days').format()
    };
  }

  runBacktest(ticker, toDate, fromDate, deviation, shortTerm, longTerm) {
    let { to, from } = this.getDateRanges(toDate, fromDate);

    if (isNaN(deviation)) {
      throw errors.InvalidArgumentsError();
    }

    return this.getData(ticker, to, from)
      .then(quotes => {
        return this.executeMeanReversion(this.calcMA, quotes, shortTerm, longTerm);
      })
      .catch(err => {
        console.log('ERROR! backtest', err);
        throw errors.InvalidArgumentsError();
      });
  }

  runBacktestSnapshot(ticker, toDate, fromDate, deviation, shortTerm, longTerm) {
    let autoDeviation = false,
      quotes = null,
      yesterdayDecision = null;

    let { to, from } = this.getDateRanges(toDate, fromDate);

    if (isNaN(deviation)) {
      autoDeviation = true;
    }

    return this.getData(ticker, to, from)
      .then(data => {
        quotes = data;
        return data;
      })
      .then(decisions => {
        let MAs = this.executeMeanReversion(this.calcMA, quotes, shortTerm, longTerm);
        yesterdayDecision = MAs[MAs.length - 1];

        let recommendedDifference = DecisionService.findDeviation(MAs, fromDate);

        if (autoDeviation) {
          deviation = recommendedDifference;
        }
        let returns = DecisionService.calcReturns(MAs, deviation, fromDate);

        return { ...returns, deviation, recommendedDifference, shortTerm, longTerm };
      })
      .then(algoStats => {
        let lastPrice = quotes[quotes.length - 1].close,
          lastVolume = quotes[quotes.length - 1].volume,
          trending = DecisionService.getTrendsConst().indet;

        //Check to see if yesterday's moving avgs trigger a signal
        if (DecisionService.triggerCondition(lastPrice, yesterdayDecision.shortTermAvg, yesterdayDecision.longTermAvg, deviation)) {
          trending = yesterdayDecision.trending;
        }

        let quoteInfo = { lastPrice, lastVolume, trending };
        return { ...algoStats, ...quoteInfo };
      })
      .catch(err => {
        console.log('ERROR! backtest snapshot', err, ticker);
        throw errors.InvalidArgumentsError();
      });
  }

  executeMeanReversion(calculationFn, quotes, shortTerm, longTerm) {
    return quotes.reduce(function (accumulator, value, idx) {
      if (idx >= longTerm) {
        let movingAverages = calculationFn(quotes, idx, idx - longTerm, shortTerm, longTerm);

        accumulator.push(movingAverages);
      }
      return accumulator;
    }, []);
  }

  calcMA(quotes, endIdx, startIdx, shortTerm, longTerm) {
    if (endIdx === undefined) {
      endIdx = quotes.length - 1;
    }

    if (startIdx === undefined) {
      startIdx = 0;
    }

    let trend = DecisionService.getInitialTrend(quotes, endIdx);

    let data = quotes.slice(startIdx, endIdx + 1);

    let date          = moment(data[data.length - 1].date).valueOf(),
        trending      = null,
        deviation     = null,
        shortTermAvg  = null,
        longTermAvg   = null,
        close         = data[data.length - 1].close,
        total         = 0;

    for (let i = data.length - 1; i > 0; i--) {
      let current = data[i];
      total += current.close;
      if (i === (data.length - shortTerm)) {
        shortTermAvg = total / shortTerm;
      } else if (i === (data.length - longTerm)) {
        longTermAvg = total / longTerm;
        deviation = DecisionService.calculatePercentDifference(shortTermAvg, longTermAvg);
        trending = DecisionService.getTrendLogic(close, shortTermAvg, longTermAvg, trend);
        break;
      }
    }

    return {
      date,
      trending,
      deviation,
      shortTermAvg,
      longTermAvg,
      close
    };
  }

  getClosingPrices(history) {
    let lastQuote = moment().add('days', 1);
    return history.reduce((accumulator, current, currentIdx) => {
      if (moment(current.date).isBefore(lastQuote)) {
        accumulator.push(current.close);
      }
      lastQuote = current;
      return accumulator;
    }, []);
  }

  getMA(history, rangeStart, rangeEnd) {
    let date          = moment(history[history.length - 1].date).valueOf(),
        close         = history[history.length - 1].close,
        total         = 0,
        averages      = {};

    for (let i = history.length - 1; i > 0; i--) {
      let current = history[i],
          period = history.length - i;
      total += current.close;
      if (period >= rangeStart && period <= rangeEnd) {
        averages[period] = total / period;
      }
    }

    return {
      date,
      averages,
      close
    };
  }

  getDecisionData(historicalData, endIdx, startIdx) {
    if (endIdx === undefined) {
      endIdx = historicalData.length - 1;
    }

    if (startIdx === undefined) {
      startIdx = 0;
    }

    let trend = DecisionService.getInitialTrend(historicalData, endIdx);

    let data = historicalData.slice(startIdx, endIdx + 1);

    return data.reduceRight((accumulator, currentValue, currentIdx) => {
      accumulator.total += currentValue.close;
      switch (currentIdx) {
        case data.length - 30:
          accumulator.thirtyAvg = accumulator.total / 30;
          accumulator.thirtyTotal = accumulator.total;
          break;
        case data.length - 90:
          accumulator.ninetyAvg = accumulator.total / 90;
          accumulator.ninetyTotal = accumulator.total;
          accumulator.deviation = DecisionService.calculatePercentDifference(accumulator.thirtyAvg, accumulator.ninetyAvg);
          accumulator.trending = DecisionService.getTrendLogic(accumulator.close, accumulator.thirtyAvg, accumulator.ninetyAvg, trend);
          break;
      }
      return accumulator;
    }, {
        date: moment(data[data.length - 1].date).valueOf(),
        trending: null,
        deviation: null,
        thirtyAvg: null,
        ninetyAvg: null,
        close: data[data.length - 1].close,
        thirtyTotal: 0,
        ninetyTotal: 0,
        total: 0
      });
  }

  /*
  * Get tomorrow's price range that will set off buy/sell signal aka Money Function
  * @param {object[]} historicalData  Array of QuoteService
  * @param {integer} endIdx Last index
  * @param {float} thirtyAvg 30 day average
  * @param {float} ninetyAvg 90 day average
  * @param {float} deviation Accepted deviation from intersection
  */
  calcPricing(historicalData, endIdx, thirtyAvgTotal, ninetyAvgTotal, deviation) {
    //Subtract the last price
    thirtyAvgTotal -= historicalData[endIdx - 29].close; //{value.closing}
    ninetyAvgTotal -= historicalData[endIdx - 89].close;
    let range = DecisionService.solveExpression(thirtyAvgTotal, ninetyAvgTotal, deviation);

    return range;
  }
}

module.exports.ReversionService = new ReversionService();
