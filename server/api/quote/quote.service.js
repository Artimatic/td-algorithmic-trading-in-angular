import * as moment from 'moment';
import * as _ from 'lodash';
import * as RequestPromise from 'request-promise';
const YahooFinanceAPI = require('yahoo-finance-data');
import * as algotrader from 'algotrader';
import PortfolioService from '../portfolio/portfolio.service';

import * as configurations from '../../config/environment';

const yahoo = {
  key: configurations.yahoo.key,
  secret: configurations.yahoo.secret
};

const appUrl = configurations.apps.goliath;

const api = new YahooFinanceAPI(yahoo);
const AlphaVantage = algotrader.Data.AlphaVantage;
const av = new AlphaVantage(configurations.alpha.key);

class QuoteService {
  /*
  * Interval: ["1m", "1d"]
  * Range: ["1d","5d","1mo","3mo","6mo","1y","2y","5y","10y","ytd","max"]
  */
  getData(symbol, interval = '1d', range = '1d') {
    return this.getRawData(symbol, interval, range)
      .then((data) => {
        const dataSize = _.get(data, 'chart.result[0].timestamp', []).length;
        console.log('Found: ', dataSize);
        if (dataSize > 1) {
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
        } else  {
          return api.getHistoricalData(symbol, interval, range);
        }

      });
  }

  getRawData(symbol, interval = '1d', range = '1d') {
    if (interval === '1m') {
      return api.getHistoricalData(symbol, interval, range)
        .then((data) => {
          const close = _.get(data, 'chart.result[0].indicators.quote[0].close', []);

          const quote = _.get(data, 'chart.result[0].indicators.quote[0]', []);

          const timestamps = _.get(data, 'chart.result[0].timestamp', []);

          close.forEach((val, idx) => {
            if (!val) {
              quote.close.splice(idx, 1);
              quote.open.splice(idx, 1);
              quote.high.splice(idx, 1);
              quote.low.splice(idx, 1);
              quote.volume.splice(idx, 1);
              timestamps.splice(idx, 1);
            }
          });

          return data;
        });
    } else {
      let endDate = moment().valueOf();
      let startDate = moment(endDate).subtract(30, 'years').valueOf();

      if (range === '5d') {
        startDate = moment(endDate).subtract(5, 'days').valueOf();
      } else if (range === '1mo') {
        startDate = moment(endDate).subtract(1, 'months').valueOf();
      } else if (range === '3mo') {
        startDate = moment(endDate).subtract(3, 'months').valueOf();
      } else if (range === '1y') {
        startDate = moment(endDate).subtract(1, 'years').valueOf();
      } else if (range === '2y') {
        startDate = moment(endDate).subtract(2, 'years').valueOf();
      } else if (range === '5y') {
        startDate = moment(endDate).subtract(5, 'years').valueOf();
      }

      return PortfolioService.getDailyQuoteInternal(symbol, startDate, endDate);
    }
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

  getLastPrice(symbol) {
    const query = `${configurations.apps.tiingo}iex/${symbol}`;
    const options = {
      method: 'GET',
      json: true,
      uri: query,
      headers: {
        Authorization: 'Token ' + configurations.tiingo.key,
        'Content-Type': 'application/json'
      }
    };

    return RequestPromise(options);
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

  getTiingoIntraday(symbol, date) {
    const query = `${configurations.apps.tiingo}iex/${symbol}/prices?startDate=${date}&resampleFreq=1min`;
    const options = {
      method: 'GET',
      json: true,
      uri: query,
      headers: {
        Authorization: 'Token ' + configurations.tiingo.key,
        'Content-Type': 'application/json'
      }
    };

    return RequestPromise(options)
      .then(quotes => {
        console.log(quotes);
        const data = this.createIntradayData();

        _.forEach(quotes, (quote) => {
          data.chart.result[0].timestamp.push(moment(quote.date).unix());
          data.chart.result[0].indicators.quote[0].close.push(quote.close);
          data.chart.result[0].indicators.quote[0].low.push(quote.low);
          data.chart.result[0].indicators.quote[0].volume.push(null);
          data.chart.result[0].indicators.quote[0].open.push(quote.open);
          data.chart.result[0].indicators.quote[0].high.push(quote.high);
        });

        return data;
      });
  }

  getIntradayDataV2(symbol, interval) {
    return av.timeSeriesIntraday(symbol, interval)
      .then(quotes => {
        const data = this.createIntradayData();

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

  convertTdIntraday(quotes) {
    const data = this.createIntradayData();

    _.forEach(quotes, (quote) => {
      data.chart.result[0].timestamp.push(moment(quote.datetime).unix());
      data.chart.result[0].indicators.quote[0].close.push(quote.close);
      data.chart.result[0].indicators.quote[0].low.push(quote.low);
      data.chart.result[0].indicators.quote[0].volume.push(quote.volume);
      data.chart.result[0].indicators.quote[0].open.push(quote.open);
      data.chart.result[0].indicators.quote[0].high.push(quote.high);
    });

    return data;
  }

  convertTdIntradayV2(symbol, quotes) {
    _.forEach(quotes, (quote) => {
      quote.date = moment(quote.datetime).toISOString();
      quote.symbol = symbol;
    });

    return quotes;
  }

  getOptionChain(symbol) {
    return api.optionChain(symbol);
  }

  createIntradayData() {
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
    return data;
  }

}

export default new QuoteService();
