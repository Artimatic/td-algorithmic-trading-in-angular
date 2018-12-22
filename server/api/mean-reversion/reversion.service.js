const moment = require('moment');

import BaseErrors from '../../components/errors/baseErrors';
import QuoteService from '../quote/quote.service';

const DecisionService = require('./reversion-decision.service');

class ReversionService {
  getTrend(quotes, end, thirtyDay, ninetyDay, deviation) {
    let trend = DecisionService.getInitialTrend(quotes, end, deviation);
    trend = DecisionService.getTrendLogic(quotes[end], thirtyDay, ninetyDay, trend, deviation);
    return trend;
  }

  getData(ticker, currentDate, startDate) {
    const { to, from } = this.getDateRanges(currentDate, startDate);
    return QuoteService.getDailyQuotes(ticker, to, from)
      .then(data => {
        return data;
      });
  }

  getDateRanges(to, from) {
    return {
      to: moment(to).format(),
      from: moment(from).subtract(118, 'days').format()
    };
  }

  runBacktest(ticker, toDate, fromDate, deviation, shortTerm, longTerm) {
    const { to, from } = this.getDateRanges(toDate, fromDate);

    if (isNaN(deviation)) {
      throw BaseErrors.InvalidArgumentsError();
    }

    return this.getData(ticker, to, from)
      .then(quotes => {
        return this.executeMeanReversion(this.calcMA, quotes, shortTerm, longTerm);
      })
      .catch(err => {
        console.log('ERROR! backtest', err);
        throw BaseErrors.InvalidArgumentsError();
      });
  }

  runBacktestSnapshot(ticker, toDate, fromDate, deviation, shortTerm, longTerm) {
    let autoDeviation = false,
      quotes = null,
      yesterdayDecision = null;

    const { to, from } = this.getDateRanges(toDate, fromDate);

    if (isNaN(deviation)) {
      autoDeviation = true;
    }

    return this.getData(ticker, to, from)
      .then(data => {
        quotes = data;
        return data;
      })
      .then(decisions => {
        const MAs = this.executeMeanReversion(this.calcMA, quotes, shortTerm, longTerm);
        yesterdayDecision = MAs[MAs.length - 1];

        const recommendedDifference = 0.003;

        if (autoDeviation) {
          deviation = recommendedDifference;
        }
        const returns = DecisionService.calcReturns(MAs, deviation, fromDate);

        return { ...returns, deviation, recommendedDifference, shortTerm, longTerm };
      })
      .then(algoStats => {
        const lastPrice = quotes[quotes.length - 1].close,
          lastVolume = quotes[quotes.length - 1].volume;
        let trending = DecisionService.getTrendsConst().indet;

        // Check to see if yesterday's moving avgs trigger a signal
        if (DecisionService.triggerCondition(lastPrice, yesterdayDecision.shortTermAvg, yesterdayDecision.longTermAvg, deviation)) {
          trending = yesterdayDecision.trending;
        }

        const additionalInfo = { algo: 'MACrossover', lastPrice, lastVolume, trending };
        return { ...algoStats, ...additionalInfo };
      })
      .catch(err => {
        console.log('ERROR! backtest snapshot', err, ticker);
        throw BaseErrors.InvalidArgumentsError();
      });
  }

  executeMeanReversion(calculationFn, quotes, shortTerm, longTerm) {
    return quotes.reduce(function (accumulator, value, idx) {
      if (idx >= longTerm) {
        const movingAverages = calculationFn(quotes, idx, idx - longTerm, shortTerm, longTerm);

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

    const trend = DecisionService.getInitialTrend(quotes, endIdx);

    const data = quotes.slice(startIdx, endIdx + 1),
      date = moment(data[data.length - 1].date).valueOf(),
      close = data[data.length - 1].close;

    let trending = null,
      deviation = null,
      shortTermAvg = null,
      longTermAvg = null,
      total = 0;

    for (let i = data.length - 1; i > 0; i--) {
      const current = data[i];
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

  getMA(history, rangeStart, rangeEnd) {
    const date = moment(history[history.length - 1].date).valueOf(),
      close = history[history.length - 1].close,
      averages = {};

    let total = 0;
    for (let i = history.length - 1; i > 0; i--) {
      const current = history[i],
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

    const trend = DecisionService.getInitialTrend(historicalData, endIdx);

    const data = historicalData.slice(startIdx, endIdx + 1);

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
    // Subtract the last price
    thirtyAvgTotal -= historicalData[endIdx - 29].close; // {value.closing}
    ninetyAvgTotal -= historicalData[endIdx - 89].close;
    const range = DecisionService.solveExpression(thirtyAvgTotal, ninetyAvgTotal, deviation);

    return range;
  }
}

export default new ReversionService();
