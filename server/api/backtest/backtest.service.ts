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
import configurations from '../../config/environment';

const appUrl = configurations.apps.goliath;

const config = {
  shortTerm: [3, 103],
  longTerm: [5, 286]
};

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

  getMfi(high, low, close, volume, period) {
    return tulind.indicators.mfi.indicator([high, low, close, volume], [period]);
  }

  getRateOfChange(real, period) {
    return tulind.indicators.roc.indicator([real], [period]);
  }

  evaluateStrategyAll(ticker, end, start) {
    console.log('Executing: ', ticker, new Date());
    startTime = moment();
    return this.runTest(ticker, end, start);
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

  cutCsv(name, startDate, currentDate, rows, fields, count) {
    if (rows.length > 10000) {
      this.writeCsv(name, startDate, currentDate, rows, fields, count);
    }
    return count;
  }

  writeCsv(name, startDate, currentDate, rows, fields, count) {
    fs.writeFile(path.join(__dirname, '../../../tmp/' +
      `${name}_analysis_${startDate}-${currentDate}_${count}.csv`
    ), json2csv({ data: rows, fields: fields }), function (err) {
      if (err) { throw err; }
      console.log('file saved');
    });
    rows.length = 0;
    return ++count;
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
            if (i < j) {
              const MAs = ReversionService.executeMeanReversion(ReversionService.calcMA, quotes, i, j);
              const recommendedDifference = 0.003;

              const averagesRange = { shortTerm: i, longTerm: j };
              const returns = DecisionService.calcReturns(MAs, recommendedDifference, startDate);

              if (returns.totalReturns > 0 && returns.totalTrades > 3) {
                snapshots.push({ ...averagesRange, ...returns, recommendedDifference });
              }

              snapshots.push({ ...averagesRange, ...returns, recommendedDifference });

              if (i % 3 === 0 && j === longTerm[longTerm.length - 1] - 1) {
                fs.writeFile(`${ticker}_analysis_${startDate}-
                  ${currentDate}_${i}.csv`, json2csv({ data: snapshots, fields: fields }), function (err) {
                    if (err) { throw err; }
                    console.log('file saved');
                  });
                snapshots.length = 0;
              }
            }
          }
        }
        console.log('Calculations done: ', ticker, new Date());
        endTime = moment();

        const duration = moment.duration(endTime.diff(startTime)).humanize();

        console.log('Duration: ', duration);

        fs.writeFile(`${ticker}_analysis_${currentDate}-${startDate}.csv`,
          json2csv({ data: snapshots, fields: fields }), function (err) {
            if (err) { throw err; }
            console.log('file saved');
          });
        return snapshots;
      });
  }

  runIntradayEvaluation(symbol, currentDate, startDate) {
    const minQuotes = 81;
    const getIndicatorQuotes = [];

    return QuoteService.queryForIntraday(symbol, startDate, currentDate)
      .then(quotes => {
        console.log(`Found ${quotes.length} for ${symbol}`);
        _.forEach(quotes, (value, key) => {
          const idx = Number(key);
          if (idx > minQuotes) {
            const q = _.slice(quotes, idx - minQuotes, idx);
            getIndicatorQuotes.push(this.initStrategy(q));
          }
        });
        return Promise.all(getIndicatorQuotes);
      })
      .then(indicators => {
        const bbRangeFn = (price, bband) => {
          const lower = bband[0][0];
          return price < lower;
        };

        const lossThreshold = 0.002;
        const profitThreshold = 0.003;
        const mfiRange = [20, 80];
        const fields = ['leftRange', 'rightRange', 'totalTrades', 'net', 'avgTrade', 'returns'];
        let count = 0;
        let leftRange = -0.9;
        let rightRange = 0.9;

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

            // if (results.net > 0 && _.divide(indicators.length, results.trades) < 250) {
            rows.push({
              leftRange,
              rightRange,
              net: _.round(results.net, 3),
              avgTrade: _.round(_.divide(results.total, results.trades), 3),
              returns: _.round(_.divide(results.net, results.total), 3),
              totalTrades: results.trades
            });
            // }

            count = this.cutCsv(`${symbol}-intraday`, startDate, currentDate, rows, fields, count);
            rightRange = _.round(_.subtract(rightRange, 0.1), 3);
          }
          leftRange = _.round(_.add(leftRange, 0.1), 3);
          rightRange = 0.9;
        }

        this.writeCsv(symbol, startDate, currentDate, rows, fields, count);
        return [];
      });
  }

  runIntradayTest(symbol, currentDate, startDate) {
    const minQuotes = 81;
    const getIndicatorQuotes = [];

    return QuoteService.queryForIntraday(symbol, startDate, currentDate)
      .then(quotes => {
        _.forEach(quotes, (value, key) => {
          const idx = Number(key);
          if (idx > minQuotes) {
            const q = _.slice(quotes, idx - minQuotes, idx);
            getIndicatorQuotes.push(this.initStrategy(q));
          }
        });
        return Promise.all(getIndicatorQuotes);
      })
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
      total: 0
    };

    _.forEach(indicators, (indicator) => {
      if (indicator.close) {
        let orderType;
        const avgPrice = this.estimateAverageBuyOrderPrice(orders);
        let sell = false,
          buy = false;
        if (orders.buy.length > 0) {
          sell = sellSignalFn(avgPrice, indicator.close, lossThreshold, profitThreshold);
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

  evaluateMACrossover(symbol, currentDate, startDate) {
    const minQuotes = 81;
    const getIndicatorQuotes = [];

    return QuoteService.queryForIntraday(symbol, startDate, currentDate)
      .then(quotes => {
        _.forEach(quotes, (value, key) => {
          const idx = Number(key);
          if (idx > minQuotes) {
            const q = _.slice(quotes, idx - minQuotes, idx);
            getIndicatorQuotes.push(this.initMAIndicators(q));
          }
        });
        return Promise.all(getIndicatorQuotes);
      })
      .then(indicators => {
        const bbRangeFn = (price, bband) => {
          const lower = bband[0][0];
          return price < lower;
        };

        const lossThreshold = 0.002;
        const profitThreshold = 0.003;
        const fields = ['rocLeft', 'rocRight', 'mfiLeft', 'mfiRight', 'totalTrades', 'net', 'avgTrade', 'returns'];
        let count = 0;
        let rocLeft = -0.9;
        let rocRight = 0.9;
        let mfiLeft = 0;
        let mfiRight = 100;
        const rows = [];
        while (rocLeft < 0) {
          while (rocRight > 0) {
            while (mfiLeft < 100) {
              while (mfiRight > 0) {
                const rocDiffRange = [rocLeft, rocRight];
                const mfiRange = [mfiLeft, mfiRight];

                const results = this.getBacktestResults(this.getMABuySignal,
                  this.getSellSignal,
                  indicators,
                  bbRangeFn,
                  mfiRange,
                  rocDiffRange,
                  lossThreshold,
                  profitThreshold);

                // if (results.net > 0 && _.divide(indicators.length, results.trades) < 250) {
                rows.push({
                  rocLeft,
                  rocRight,
                  mfiLeft,
                  mfiRight,
                  net: _.round(results.net, 3),
                  avgTrade: _.round(_.divide(results.total, results.trades), 3),
                  returns: _.round(_.divide(results.net, results.total), 3),
                  totalTrades: results.trades
                });
                // }

                count = this.cutCsv(`${symbol}-crossover-intraday`, startDate, currentDate, rows, fields, count);
                mfiRight = _.subtract(mfiRight, 1);
              }
              mfiLeft = _.add(mfiLeft, 1);
              mfiRight = 100;
            }
            rocRight = _.round(_.subtract(rocRight, 0.1), 3);
          }
          rocLeft = _.round(_.add(rocLeft, 0.1), 3);
          rocRight = 0.9;
        }

        this.writeCsv(`${symbol}-crossover-intraday`, startDate, currentDate, rows, fields, count);
        return [];
      });
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

  getSellSignal(paidPrice, currentPrice, lossThreshold, profitThreshold) {
    const gain = DecisionService.getPercentChange(currentPrice, paidPrice);
    if (gain < lossThreshold || gain > profitThreshold) {
      return true;
    }
  }

  getMABuySignal(indicator: any, rocDiffRange, mfiRange: number[]) {
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
      if (indicator.mfiLeft > mfiRange[0] && indicator.mfiLeft < mfiRange[1]) {
        const crossover = _.round(DecisionService.calculatePercentDifference(indicator.sma5, indicator.sma70), 3);
        if (crossover < 0.001) {
          return true;
        }
      }
    }

    return false;
  }

  calcTrade(orders, dayQuote, orderType, avgPrice) {
    if (orderType === 'sell') {
      // Sell
      orders.trades++;
      if (orders.buy.length > 0) {
        const len = orders.buy.length,
          profit = (dayQuote.close - avgPrice) * len;

        orders.total += (avgPrice * len);
        orders.net += profit;
        dayQuote.signal = 'sell';
        orders.history.push(dayQuote);
        orders.buy = [];
      }
    } else if (orderType === 'buy') {
      // Buy
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
    return _.slice(reals, reals.length - (period + 1));
  }

  processQuotes(quotes) {
    const reals = [],
      highs = [],
      lows = [],
      volumes = [],
      timeline = [];

    _.forEach(quotes, (value) => {
      reals.push(value.close);
      highs.push(value.high);
      lows.push(value.low);
      volumes.push(value.volume);
      timeline.push(value.date);
    });

    return { reals, highs, lows, volumes, timeline };
  }

  initStrategy(quotes) {
    const currentQuote = quotes[quotes.length - 1];
    const indicators = this.processQuotes(quotes);

    return this.getBBands(indicators.reals, 80, 2)
      .then((bband80) => {
        currentQuote.bband80 = bband80;
        return this.getRateOfChange(this.getSubArray(indicators.reals, 10), 10);
      })
      .then((roc10) => {
        const rocLen = roc10[0].length - 1;
        currentQuote.roc10 = _.round(roc10[0][rocLen], 3);
        return this.getRateOfChange(this.getSubArray(indicators.reals, 70), 70);
      })
      .then((roc70) => {
        const rocLen = roc70[0].length - 1;
        currentQuote.roc70 = _.round(roc70[0][rocLen], 3);
        return this.getMfi(this.getSubArray(indicators.highs, 14),
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

  initMAIndicators(quotes) {
    const currentQuote = quotes[quotes.length - 1];
    const indicators = this.processQuotes(quotes);

    return this.getBBands(indicators.reals, 80, 2)
      .then((bband80) => {
        currentQuote.bband80 = bband80;
        return this.getSMA(indicators.reals, 5);
      })
      .then((sma5) => {
        currentQuote.sma5 = sma5[0][sma5[0].length - 1];
        return this.getSMA(indicators.reals, 70);
      })
      .then((sma70) => {
        currentQuote.sma70 = sma70[0][sma70[0].length - 1];
        return this.getRateOfChange(this.getSubArray(indicators.reals, 10), 10);
      })
      .then((roc10) => {
        const rocLen = roc10[0].length - 1;
        currentQuote.roc10 = _.round(roc10[0][rocLen], 3);
        return this.getRateOfChange(this.getSubArray(indicators.reals, 70), 70);
      })
      .then((roc70) => {
        const rocLen = roc70[0].length - 1;
        currentQuote.roc70 = _.round(roc70[0][rocLen], 3);
        return this.getRateOfChange(this.getSubArray(indicators.reals, 5), 5);
      })
      .then((roc5) => {
        const rocLen = roc5[0].length - 1;
        currentQuote.roc5 = _.round(roc5[0][rocLen], 3);
        return this.getMfi(this.getSubArray(indicators.highs, 14),
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


    const query = `${appUrl}backtest/strategy/mean-reversion/train?` +
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
    const query = `${appUrl}backtest/strategy/mean-reversion/chart?` +
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
    const post = `${appUrl}backtest/train/find`;

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
}

export default new BacktestService();
