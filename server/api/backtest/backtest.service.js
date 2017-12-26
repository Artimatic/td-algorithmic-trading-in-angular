import moment from 'moment';
import { QuoteService } from './../quote/quote.service';
import { ReversionService } from './../mean-reversion/reversion.service';
import * as DecisionService from './../mean-reversion/reversion-decision.service';

import * as errors from '../../components/errors/baseErrors';
import { start } from 'repl';

class BacktestService {
  evaluateStrategyAll(ticker, end, start) {
    console.log('Executing');
    return this.getData(ticker, end, start);
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

    let shortTerm = [5, 50];
    let longTerm = [10, 100];
    let snapshots = [];
    return QuoteService.getData(ticker, start, end)
      .then(quotes => {
        for (let i = shortTerm[0]; i < shortTerm[1]; i++) {
          for (let j = longTerm[0]; j < longTerm[1]; j++) {
            console.log("==================================");
            console.log("short term: ", i, " long term: ", j);

            let MAs = ReversionService.executeMeanReversion(ReversionService.calcMA, quotes, i, j);
            let yesterdayDecision = MAs[MAs.length - 1];
            let recommendedDifference = DecisionService.findDeviation(MAs, startDate);

            let averagesRange = {shortTerm: i, longTerm: j};
            let returns = DecisionService.calcReturns(MAs, recommendedDifference, startDate);

            console.log("Adding snapshot: ", returns);

            snapshots.push({ ...averagesRange, ...returns, recommendedDifference });
            console.log("==================================");

          }
        }

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
