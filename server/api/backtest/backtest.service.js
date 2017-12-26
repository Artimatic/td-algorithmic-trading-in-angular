import moment from 'moment';
import { QuoteService } from './../quote/quote.service';
import { ReversionService } from './../reversion/reversion.service';

import * as errors from '../../components/errors/baseErrors';
import { start } from 'repl';

const config = {
  longTerm: 118
};

class BacktestService {
  evaluateStrategyAll(ticker, end, start) {
    console.log('test000');
    return this.getData(ticker, end, start);
  }

  getDateRanges(currentDate, startDate) {
    let currentDate = moment(currentDate),
      startDate = moment(startDate);

    let days = currentDate.diff(startDate, 'days') + 1;

    return {
      end: currentDate.format(),
      start: startDate.subtract(this.getTradeDays(days), 'days').format()
    };
  }

  getData(ticker, currentDate, startDate) {
    let { end, start } = this.getDateRanges(currentDate, startDate);

    return QuoteService.getData(ticker, start, end)
      .then(data => {
        return data;
      });
  }

  getTradeDays(days) {
    let workDaysPerWeek = 5 / 7,
      holidays = 9;

    return Math.ceil(days * workDaysPerWeek - holidays);
  }

}

module.exports.BacktestService = new BacktestService();
