import google from '../../components/google-finance';
import _ from 'lodash';
import moment from 'moment';
import boom from 'boom';
import RequestPromise from 'request-promise';

import { feedQuandl } from 'd3fc-financial-feed';
import YahooFinanceAPI from 'yahoo-finance-data';

import errors from '../../components/errors/baseErrors';

const api = new YahooFinanceAPI({
  key: 'dj0yJmk9TUdJOGpUZms0OUl2JmQ9WVdrOVlVdFFWazF3TkdzbWNHbzlNQS0tJnM9Y29uc3VtZXJzZWNyZXQmeD04Mw--',
  secret: 'a46cf2610a81dceb6a9306fda66dcfc767e76055'
});

const quandl = feedQuandl()
  .apiKey('5DsGxgTS3k9BepaWg_MD')
  .database('WIKI');

function checkDate(toDate, fromDate) {
  let to = moment(toDate);
  let from = moment(fromDate);

  if (!to.isValid() || !from.isValid()) {
    throw new errors.Http400Error('Invalid arguments')
  }

  return { to, from };
}

class QuoteService {
  getData(ticker, toDate, fromDate) {
    let { to, from } = checkDate(toDate, fromDate);

    let diff = Math.abs(to.diff(from, 'days'));

    let intervalOption;

    if (diff <= 5) {
      intervalOption = '5d';
    } else if (diff <= 30) {
      intervalOption = '1mo';
    } else if (diff <= 90) {
      intervalOption = '3mo';
    } else if (diff <= 365) {
      intervalOption = '1y';
    } else if (diff <= 730) {
      intervalOption = '2y';
    } else if (diff <= 1825) {
      intervalOption = '5y';
    } else {
      intervalOption = '10y';
    }

    return api.getHistoricalData(ticker, '1d', intervalOption)
      .then((data) => {
        let quotes = _.get(data, 'chart.result[0].indicators.quote[0]', []);
        let timestamps = _.get(data, 'chart.result[0].timestamp', []);
        let converted = [];

        timestamps.forEach((val, idx) => {
          let quote = {
            symbol: ticker,
            date: moment.unix(val).toISOString(),
            open: quotes.open[idx],
            high: quotes.high[idx],
            low: quotes.low[idx],
            close: quotes.close[idx],
            volume: quotes.volume[idx]
          };
          converted.push(quote);
        });

        return converted;
      });

  }

  getDataQuandl(ticker, startDate, endDate) {
    let { start, end } = checkDate(startDate, endDate);

    if (!start.isValid() || !end.isValid()) {
      throw new errors.Http400Error('Invalid arguments')
    }

    let quote = quandl
      .dataset(ticker)
      .start(start.toDate())
      .end(end.toDate())
      .descending(true)
      .collapse('daily');

    return new Promise(function (resolve, reject) {
      quote((error, data) => {
        if (error) {
          console.log("error: ", error);
          reject(new errors.FileNotFoundError(error));
        }
        resolve(data);
      });
    })
  }

  getLocalQuotes(ticker, toDate, fromDate) {
    let { to, from } = checkDate(toDate, fromDate);

    const  diff = Math.abs(to.diff(from, 'days'));

    to = to.format('YYYY-MM-DD');
    from = from.format('YYYY-MM-DD');

    const query = `http://localhost:8080/backtest?ticker=${ticker}&to=${to}&from=${from}`;
    const options = {
      method: 'POST',
      uri: query
    };

    return RequestPromise(options)
      .then((data) => {
        let arr = JSON.parse(data);
        return arr;
      });
  }
}

module.exports.QuoteService = new QuoteService();
