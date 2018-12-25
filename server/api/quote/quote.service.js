import _ from 'lodash';
import moment from 'moment';
import RequestPromise from 'request-promise';
const YahooFinanceAPI = require('yahoo-finance-data');
import * as algotrader from 'algotrader';

import configurations from '../../config/environment';

const yahoo = {
  key: configurations.yahoo.key,
  secret: configurations.yahoo.secret
};

const appUrl = configurations.apps.goliath;

const api = new YahooFinanceAPI(yahoo);
const AlphaVantage = algotrader.Data.AlphaVantage;
const av = new AlphaVantage(configurations.alpha.key);
const IEX = algotrader.Data.IEX;

class QuoteService {
  /*
  * Interval: ["2m", "1d"]
  * Range: ["1d","5d","1mo","3mo","6mo","1y","2y","5y","10y","ytd","max"]
  */
  getData(symbol, interval = '1d', range) {
    return api.getHistoricalData(symbol, interval, range)
      .then((data) => {
        const quotes = _.get(data, 'chart.result[0].indicators.quote[0]', []);
        const timestamps = _.get(data, 'chart.result[0].timestamp', []);
        const converted = [];

        timestamps.forEach((val, idx) => {
          const quote = {
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

  getDailyQuotes(symbol, toDate, fromDate) {

    const to = moment(toDate);
    const from = moment(fromDate);

    const query = `${appUrl}backtest?ticker=${symbol}&to=${to.format('YYYY-MM-DD')}&from=${from.format('YYYY-MM-DD')}`;
    const options = {
      method: 'POST',
      uri: query
    };

    return RequestPromise(options)
      .then((data) => {
        const arr = JSON.parse(data);
        return arr;
      })
      .catch(() => {
        const diff = Math.abs(to.diff(from, 'days'));

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

  getPrice(symbol) {
    return IEX.getQuote(symbol);
  }

  getIntradayData(symbol, interval) {
    return api.getIntradayChartData(symbol, interval, true);
  }

  queryForIntraday(symbol, from, to) {
    const url = `${appUrl}backtest/find/intraday`;
    const options = {
      method: 'GET',
      qs: {
        symbol,
        to,
        from
      },
      uri: url
    };

    return RequestPromise(options)
      .then(results => {
        return JSON.parse(results);
      });
  }

  postIntradayData(quotes) {
    const query = `${appUrl}backtest/add/intradaydata`;
    const options = {
      method: 'POST',
      json: true,
      uri: query,
      body: quotes
    };

    return RequestPromise(options);
  }

  getIntradayDataV2(symbol, interval) {
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
        data.chart.result[0].timestamp.push(moment(quote.getDate()).unix());
        data.chart.result[0].indicators.quote[0].close.push(quote.getClose());
        data.chart.result[0].indicators.quote[0].low.push(quote.getLow());
        data.chart.result[0].indicators.quote[0].volume.push(quote.getVolume());
        data.chart.result[0].indicators.quote[0].open.push(quote.getOpen());
        data.chart.result[0].indicators.quote[0].high.push(quote.getHigh());
      });

      return data;
    });
  }

  getOptionChain(symbol) {
    return api.optionChain(symbol);
  }

}

export default new QuoteService();
