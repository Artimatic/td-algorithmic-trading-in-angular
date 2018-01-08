import moment from 'moment';
import json2csv from 'json2csv';
import fs from 'fs';

import { QuoteService } from './../quote/quote.service';
import { ReversionService } from './../mean-reversion/reversion.service';
import * as DecisionService from './../mean-reversion/reversion-decision.service';

import * as errors from '../../components/errors/baseErrors';
import { start } from 'repl';

const config = {
  shortTerm: [20, 30],
  longTerm: [70, 200]
}

class BacktestService {
  evaluateStrategyAll(ticker, end, start) {
    console.log('Executing: ', new Date());
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
    let { endDate, start } = this.getDateRanges(currentDate, startDate);

    return QuoteService.getLocalQuotes(ticker, endDate, start)
      .then(data => {
        return data;
      })
      .catch((error) => {
        return QuoteService.getData(ticker, endDate, start);
      });
  }

  runTest(ticker, currentDate, startDate) {
    let shortTerm = config.shortTerm;
    let longTerm = config.longTerm;
    let snapshots = [];
    return this.getData(ticker, startDate, currentDate)
      .then(quotes => {
        console.log(startDate, " to ", currentDate);

        for (let i = shortTerm[0]; i < shortTerm[1]; i++) {
          for (let j = longTerm[0]; j < longTerm[1]; j++) {
            console.log("short:", i, " long:", j);
            let MAs = ReversionService.executeMeanReversion(ReversionService.calcMA, quotes, i, j);
            let yesterdayDecision = MAs[MAs.length - 1];
            let recommendedDifference = DecisionService.findDeviation(MAs, startDate);

            let averagesRange = { shortTerm: i, longTerm: j };
            let returns = DecisionService.calcReturns(MAs, recommendedDifference, startDate);
            console.log("returns: ", returns.totalReturns);

            snapshots.push({ ...averagesRange, ...returns, recommendedDifference });
          }
        }
        console.log('Calculations done: ', new Date());
        let fields = ['shortTerm', 'longTerm', 'totalReturns', 'totalTrades', 'recommendedDifference'];

        let csv = json2csv({ data: snapshots, fields: fields });

        fs.writeFile(`${ticker}_analysis_${currentDate}-${startDate}.csv`, csv, function (err) {
          if (err) throw err;
          console.log('file saved');
        });
        return snapshots;
      });
  }

  getTradeDays(days) {
    let workDaysPerWeek = 5 / 7,
      holidays = 9;

    return Math.ceil(days * workDaysPerWeek - holidays);
  }

}

module.exports.BacktestService = new BacktestService();