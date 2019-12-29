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

const dataServiceUrl = configurations.apps.goliath;
const mlServiceUrl = configurations.apps.armadillo;

const config = {
  shortTerm: [5, 110],
  longTerm: [10, 290]
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

  getVwma(close, volume, period) {
    return tulind.indicators.vwma.indicator([close, volume], [period]);
  }

  getDaytradeIndicators(quotes, period,
    stddev, mfiPeriod, vwmaPeriod) {
    let indicators = {
      vwma: null,
      mfi: null,
      mfiLeft: null
    };
    quotes.reals = quotes.close;
    quotes.highs = quotes.high;
    quotes.lows = quotes.low;
    quotes.volumes = quotes.volume;

    return this.getIndicators(quotes, period, indicators)
      .then(indicators => {
        indicators = indicators;
        indicators.bband = indicators.bband80;
        return this.getVwma(this.getSubArray(quotes.close, vwmaPeriod),
          this.getSubArray(quotes.volume, vwmaPeriod), vwmaPeriod);
      })
      .then(vwma => {
        const vwmaLen = vwma[0].length - 1;
        indicators.vwma = _.round(vwma[0][vwmaLen], 3)
        indicators.mfi = indicators.mfiLeft;

        return indicators;
      })
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

              // if (i % 3 === 0 && j === longTerm[longTerm.length - 1] - 1) {
              //   fs.writeFile(`${ticker}_analysis_${startDate}-
              //     ${currentDate}_${i}.csv`, json2csv({ data: snapshots, fields: fields }), function (err) {
              //       if (err) { throw err; }
              //       console.log('file saved');
              //     });
              //   snapshots.length = 0;
              // }
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

        const lossThreshold = 0.05;
        const profitThreshold = 0.05;
        const mfiRange = [20, 80];
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
            const q = _.slice(quotes, idx - minQuotes, idx);
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
            const q = _.slice(quotes, idx - minQuotes, idx);
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
      total: 0
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

  getIndicators(indicators, bbandPeriod, quote) {
    const currentQuote = quote;
    return this.getBBands(indicators.reals, bbandPeriod, 2)
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
        //   return this.getSMA(indicators.reals, 5);
        // })
        // .then((sma5) => {
        //   currentQuote.sma5 = sma5[0][sma5[0].length - 1];
        //   return this.getSMA(indicators.reals, 70);
        // })
        // .then((sma70) => {
        //   currentQuote.sma70 = sma70[0][sma70[0].length - 1];
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
        //   return this.getRateOfChange(this.getSubArray(indicators.reals, 5), 5);
        // })
        // .then((roc5) => {
        //   const rocLen = roc5[0].length - 1;
        //   currentQuote.roc5 = _.round(roc5[0][rocLen], 3);
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

  getTrainingData(symbol, endDate, startDate) {
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
        save: false
      },
    };

    return RequestPromise(options);
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
        trainingData = JSON.parse(trainingData);
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

  checkRNNStatus(symbol, endDate) {
    const to = moment(endDate).format('YYYY-MM-DD');

    const URI = `${dataServiceUrl}precog/prediction?` +
      `symbol=${symbol}&date=${to}`;

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
  * {"symbol": "SHAK",
  * "to": "2019-11-01",
  * "from":"2018-09-24",
  * "settings": [0.03, 30, 90, 80],
  * "strategy": "MoneyFlowIndex"
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
  * {"symbol": "SPY",
  * "to": "2019-11-15",
  * "from":"2018-01-24",
  * "settings": [0.03, 30, 90, 80],
  * "strategy": "MOVINGAVERAGECROSSOVER"
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
* {"symbol": "SPY",
* "to": "2019-11-15",
* "from":"2018-01-24",
* "settings": [0.03, 30, 90, 80],
* "strategy": "MOVINGAVERAGECROSSOVER"
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
}

export default new BacktestService();
