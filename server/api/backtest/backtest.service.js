import moment from 'moment';
import json2csv from 'json2csv';
import fs from 'fs';
import RequestPromise from 'request-promise';

import { QuoteService } from './../quote/quote.service';
import { ReversionService } from './../mean-reversion/reversion.service';
import * as DecisionService from './../mean-reversion/reversion-decision.service';

import * as errors from '../../components/errors/baseErrors';
import * as tulind from 'tulind';
import configurations from '../../config/environment';

const appUrl = configurations.apps.goliath;

const config = {
  shortTerm: [3, 103],
  longTerm: [5, 286]
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

  getDateRanges(currentDate, startDate) {
    let current = moment(currentDate),
      start = moment(startDate);

    let days = current.diff(start, 'days') + 1;

    return {
      end: current.format(),
      start: start.subtract(this.getTradeDays(days), 'days').format()
    };
  }

  getData(ticker, currentDate, startDate) {
    let { end, start } = this.getDateRanges(currentDate, startDate);

    return QuoteService.getDailyQuotes(ticker, end, start)
      .then(data => {
        return data;
      });
  }

  runTest(ticker, currentDate, startDate) {
    let shortTerm = config.shortTerm;
    let longTerm = config.longTerm;
    let snapshots = [];
    return this.getData(ticker, currentDate, startDate)
      .then(quotes => {
        const fields = ['shortTerm', 'longTerm', 'totalReturns', 'totalTrades', 'recommendedDifference'];
        for (let i = shortTerm[0]; i < shortTerm[1]; i++) {
          for (let j = longTerm[0]; j < longTerm[1]; j++) {
            if (i < j) {
              let MAs = ReversionService.executeMeanReversion(ReversionService.calcMA, quotes, i, j);
              let recommendedDifference = 0.003;

              let averagesRange = { shortTerm: i, longTerm: j };
              let returns = DecisionService.calcReturns(MAs, recommendedDifference, startDate);

              if (returns.totalReturns > 0 && returns.totalTrades > 3) {
                snapshots.push({ ...averagesRange, ...returns, recommendedDifference });
              }

              snapshots.push({ ...averagesRange, ...returns, recommendedDifference });

              if (i % 3 === 0 && j === longTerm[longTerm.length - 1] - 1) {
                fs.writeFile(`${ticker}_analysis_${startDate}-${currentDate}_${i}.csv`, json2csv({ data: snapshots, fields: fields }), function (err) {
                  if (err) throw err;
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

        console.log("Duration: ", duration);

        fs.writeFile(`${ticker}_analysis_${currentDate}-${startDate}.csv`, json2csv({ data: snapshots, fields: fields }), function (err) {
          if (err) throw err;
          console.log('file saved');
        });
        return snapshots;
      });
  }

  getMeanReversionChart(ticker, currentDate, startDate, deviation, shortTerm, longTerm) {
    return this.getData(ticker, currentDate, startDate)
      .then(quotes => {
        return ReversionService.executeMeanReversion(ReversionService.calcMA, quotes, shortTerm, longTerm);
      })
      .catch(err => {
        console.log('ERROR! backtest', err);
        throw errors.InvalidArgumentsError();
      });
  }

  getTradeDays(days) {
    let workDaysPerWeek = 5 / 7,
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
        let arr = JSON.parse(data);
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
        let arr = JSON.parse(data);
        return arr;
      })
      .catch((error) => {
        console.log('Error: ', error);
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

module.exports.BacktestService = new BacktestService();
