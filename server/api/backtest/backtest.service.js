import moment from 'moment';
import json2csv from 'json2csv';
import fs from 'fs';

import { QuoteService } from './../quote/quote.service';
import { ReversionService } from './../mean-reversion/reversion.service';
import * as DecisionService from './../mean-reversion/reversion-decision.service';

import * as errors from '../../components/errors/baseErrors';
import { start } from 'repl';

const config = {
  shortTerm: [5, 200],
  longTerm: [7, 333]
}

let startTime;
let endTime;

class BacktestService {
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
    console.log(start, " to ", end);

    return QuoteService.getLocalQuotes(ticker, end, start)
      .then(data => {
        return data;
      })
      .catch((error) => {
        return QuoteService.getData(ticker, end, start);
      });
  }

  runTest(ticker, currentDate, startDate) {
    let shortTerm = config.shortTerm;
    let longTerm = config.longTerm;
    let snapshots = [];
    return this.getData(ticker, currentDate, startDate)
      .then(quotes => {
        for (let i = shortTerm[0]; i < shortTerm[1]; i++) {
          for (let j = longTerm[0]; j < longTerm[1]; j++) {
            if (i < j) {
              console.log("short:", i, " long:", j);
              let MAs = ReversionService.executeMeanReversion(ReversionService.calcMA, quotes, i, j);
              let yesterdayDecision = MAs[MAs.length - 1];
              let recommendedDifference = DecisionService.findDeviation(MAs, startDate);

              let averagesRange = { shortTerm: i, longTerm: j };
              let returns = DecisionService.calcReturns(MAs, recommendedDifference, startDate);
              console.log("returns: ", returns.totalReturns, "trades: ", returns.totalTrades);

              snapshots.push({ ...averagesRange, ...returns, recommendedDifference });
            }
          }
        }
        console.log('Calculations done: ', ticker, new Date());
        endTime = moment();

        const duration = moment.duration(endTime.diff(startTime)).humanize();

        console.log("Duration: ", duration);

        const fields = ['shortTerm', 'longTerm', 'totalReturns', 'totalTrades', 'recommendedDifference'];

        const csv = json2csv({ data: snapshots, fields: fields });

        fs.writeFile(`${ticker}_analysis_${currentDate}-${startDate}.csv`, csv, function (err) {
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

}

module.exports.BacktestService = new BacktestService();