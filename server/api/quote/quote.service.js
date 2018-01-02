import google from '../../components/google-finance';
import _ from 'lodash';
import moment from 'moment';
import boom from 'boom';

import { feedQuandl } from 'd3fc-financial-feed';
import YahooFinanceAPI from 'yahoo-finance-data';

import errors from '../../components/errors/baseErrors';

const api = new YahooFinanceAPI({
  key: 'dj0yJmk9M01YVmFheW8yQXNqJmQ9WVdrOWJHOTFNRVJXTnpnbWNHbzlNQS0tJnM9Y29uc3VtZXJzZWNyZXQmeD1jZg--',
  secret: '73f1a874dc9f596e0a1cd1ee01fcae4f08443956'
});

const quandl = feedQuandl()
  .apiKey('5DsGxgTS3k9BepaWg_MD')
  .database('WIKI');

class QuoteService {
  getData(ticker, startDate, endDate) {
    let start = moment(startDate);
    let end = moment(endDate);

    if (!start.isValid() || !end.isValid()) {
      throw new errors.Http400Error('Invalid arguments')
    }

    return api.getHistoricalData(ticker, '1d', '2y')
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
    let start = moment(startDate);
    let end = moment(endDate);

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
}

module.exports.QuoteService = new QuoteService();
