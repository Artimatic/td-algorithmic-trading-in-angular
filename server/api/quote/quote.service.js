import _ from 'lodash';
import moment from 'moment';
import RequestPromise from 'request-promise';

import { feedQuandl } from 'd3fc-financial-feed';
import YahooFinanceAPI from 'yahoo-finance-data';
import * as algotrader from 'algotrader';

import errors from '../../components/errors/baseErrors';
import config from '../../config/environment';

const yahoo = {
  key: config.yahoo.key,
  secret: config.yahoo.secret
};

const appUrl = config.apps.goliath;

const api = new YahooFinanceAPI(yahoo);
const AlphaVantage = algotrader.Data.AlphaVantage;
const av = new AlphaVantage(config.alpha.key);

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
  /*
  * Interval: ["2m", "1d"]
  * Range: ["1d","5d","1mo","3mo","6mo","1y","2y","5y","10y","ytd","max"]
  */
  getData(symbol, interval = '1d', range) {
    return api.getHistoricalData(symbol, interval, range)
      .then((data) => {
        let quotes = _.get(data, 'chart.result[0].indicators.quote[0]', []);
        let timestamps = _.get(data, 'chart.result[0].timestamp', []);
        let converted = [];

        timestamps.forEach((val, idx) => {
          let quote = {
            symbol: symbol,
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

  getRawData(symbol, interval = '1d', range) {
    return api.getHistoricalData(symbol, interval, range);
  }

  getDataQuandl(symbol, startDate, endDate) {
    let { start, end } = checkDate(startDate, endDate);

    if (!start.isValid() || !end.isValid()) {
      throw new errors.Http400Error('Invalid arguments')
    }

    let quote = quandl
      .dataset(symbol)
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

  getDailyQuotes(symbol, toDate, fromDate) {
    let { to, from } = checkDate(toDate, fromDate);

    const diff = Math.abs(to.diff(from, 'days'));

    to = to.format('YYYY-MM-DD');
    from = from.format('YYYY-MM-DD');

    const query = `${appUrl}backtest?ticker=${symbol}&to=${to}&from=${from}`;
    const options = {
      method: 'POST',
      uri: query
    };

    return RequestPromise(options)
      .then((data) => {
        let arr = JSON.parse(data);
        return arr;
      })
      .catch(() => {
        let { to, from } = checkDate(toDate, fromDate);

        let diff = Math.abs(to.diff(from, 'days'));

        let range;

        if (diff <= 5) {
          range = '5d';
        } else if (diff <= 30) {
          range = '1mo';
        } else if (diff <= 90) {
          range = '3mo';
        } else if (diff <= 365) {
          range = '1y';
        } else if (diff <= 730) {
          range = '2y';
        } else if (diff <= 1825) {
          range = '5y';
        } else {
          range = '10y';
        }

        return this.getData(symbol, '1d', range);
      });
  }

  getLastPrice(symbols) {
    return api.getRealtimeQuotes(symbols.join(','));
  }

  getIntradayData(symbol, interval) {
    return api.getIntradayChartData(symbol, interval, true);
  }

  getIntradayDataV2(symbol, interval) {
    console.log('interval:', interval);
    return av.timeSeriesIntraday(symbol, interval).then(quotes => {
      const data = {
        chart: {
          result: [
            {
              timestamp: [],
              indicators: {
                quote: [
                  {
                    low: [],
                    volume: [],
                    open: [],
                    high: [],
                    close: []
                  }
                ]
              }
            }
          ]
        }
      };

      _.forEach(quotes, (quote) => {
        data.chart.result[0].timestamp.push(moment(quote.date));
        data.chart.result[0].indicators.quote[0].close.push(quote.price.close);
        data.chart.result[0].indicators.quote[0].low.push(quote.price.low);
        data.chart.result[0].indicators.quote[0].volume.push(quote.price.volume);
        data.chart.result[0].indicators.quote[0].open.push(quote.price.open);
        data.chart.result[0].indicators.quote[0].high.push(quote.price.high);
      });

      return quotes;
    });
  }

  getOptionChain(symbol) {
    return api.optionChain(symbol);
  }
  
}

module.exports.QuoteService = new QuoteService();
