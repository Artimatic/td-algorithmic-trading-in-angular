import * as request from 'request-promise';
import * as Robinhood from 'robinhood';
import * as _ from 'lodash';
const RobinHoodApi = require('robinhood-api');
const robinhood = new RobinHoodApi();

import QuoteService from '../quote/quote.service';
import configurations from '../../config/environment';

const robinhood = {
  deviceToken: configurations.robinhood.deviceId
};

const apiUrl = 'https://api.robinhood.com/';
const tda = 'https://api.tdameritrade.com/v1/';
const tdaKey = configurations.tdameritrade.consumer_key;
const tdaRefreshToken = configurations.tdameritrade.refresh_token;
const tdAccountId = configurations.tdameritrade.accountId;

class PortfolioService {

  access_token = '';

  login(username, password, reply) {
    let options = {
      uri: apiUrl + 'oauth2/token/',
      headers: {
        'X-Robinhood-API-Version': '1.265.0'
      },
      form: {
        username: username,
        password: password,
        client_id: 'c82SH0WZOsabOXGP2sxqcj34FxkvfnWRZBKlBjFS',
        grant_type: 'password',
        expires_in: 86400,
        device_token: robinhood.deviceToken,
        scope: 'internal'
      }
    };

    return request.post(options)
      .then(() => reply.status(200).send({}))
      .catch((e) => (reply.status(401).send(e)));
  }

  mfaLogin(username, password, code, reply) {
    let options = {
      uri: apiUrl + 'oauth2/token/',
      headers: {
        'X-Robinhood-API-Version': '1.265.0'
      },
      form: {
        username: username,
        password: password,
        client_id: 'c82SH0WZOsabOXGP2sxqcj34FxkvfnWRZBKlBjFS',
        grant_type: 'password',
        expires_in: 86400,
        device_token: robinhood.deviceToken,
        scope: 'internal',
        mfa_code: code
      }
    };

    return request.post(options)
      .then((response) => reply.status(200).send(response))
      .catch((e) => (reply.status(401).send(e)));
  }

  expireToken(token, reply) {
    return request.post({
      uri: apiUrl + 'oauth2/revoke_token/',
      form: {
        client_id: 'c82SH0WZOsabOXGP2sxqcj34FxkvfnWRZBKlBjFS',
        token
      }
    })
      .then(() => reply.status(200).send({}))
      .catch((e) => (reply.status(401).send(e)));
  }

  getPortfolio(token, reply) {
    const options = {
      uri: apiUrl + 'positions/',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      json: true
    };

    return request.get(options)
      .then((response) => reply.status(200).send(response))
      .catch((e) => (reply.status(500).send(e)));
  }

  getPositions(token, reply) {
    const options = {
      uri: apiUrl + 'positions/?nonzero=true',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    return request.get(options)
      .then((response) => reply.status(200).send(response))
      .catch((e) => (reply.status(500).send(e)));
  }

  getResource(instrument, reply) {
    (async () => {
      try {
        let inst = await robinhood.getResource(instrument);
        reply.status(200).send(inst);
      } catch (e) {
        reply.status(500).send(e);
      }
    })();
  }

  getQuote(symbol) {
    if (!this.access_token) {
      return this.renewExpiredTDAccessTokenAndGetQuote(symbol);
    } else {
      return this.getTDMarketData(symbol)
        .then(this.processTDData)
        .then(quote => {
          if (quote[symbol].delayed) {
            return this.renewExpiredTDAccessTokenAndGetQuote(symbol);
          } else {
            return quote;
          }
        })
        .catch(error => this.renewExpiredTDAccessTokenAndGetQuote(symbol));
    }
  }

  sell(account, token, instrumentUrl, symbol, quantity, price, type = 'limit',
    extendedHours = false) {
    let headers = {
      'Accept': '*/*',
      'Accept-Encoding': 'gzip, deflate',
      'Accept-Language': 'en;q=1, fr;q=0.9, de;q=0.8, ja;q=0.7, nl;q=0.6, it;q=0.5',
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
      'Connection': 'keep-alive',
      'Authorization': `Bearer ${token}`
    };

    console.log('Sell order: ', {
      account: account,
      instrument: instrumentUrl,
      price: price,
      stop_price: null,
      quantity: quantity,
      side: 'sell',
      symbol: symbol,
      time_in_force: 'gfd',
      trigger: 'immediate',
      type: type,
      extended_hours: extendedHours
    });

    return request.post({
      uri: apiUrl + 'orders/',
      headers: headers,
      json: true,
      gzip: true,
      form: {
        account: account,
        instrument: instrumentUrl,
        price: price,
        stop_price: null,
        quantity: quantity,
        side: 'sell',
        symbol: symbol,
        time_in_force: 'gfd',
        trigger: 'immediate',
        type: type,
        extended_hours: extendedHours
      }
    });
  }

  buy(account,
    token,
    instrumentUrl,
    symbol,
    quantity,
    price,
    type = 'limit',
    extendedHours = false) {
    let headers = {
      'Accept': '*/*',
      'Accept-Encoding': 'gzip, deflate',
      'Accept-Language': 'en;q=1, fr;q=0.9, de;q=0.8, ja;q=0.7, nl;q=0.6, it;q=0.5',
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
      'Connection': 'keep-alive',
      'Authorization': `Bearer ${token}`
    };

    console.log('Buy order: ', {
      account: account,
      instrument: instrumentUrl,
      price: price,
      stop_price: null,
      quantity: quantity,
      side: 'buy',
      symbol: symbol,
      time_in_force: 'gfd',
      trigger: 'immediate',
      type: type,
      extended_hours: extendedHours
    });

    return request.post({
      uri: apiUrl + 'orders/',
      headers: headers,
      json: true,
      gzip: true,
      form: {
        account: account,
        instrument: instrumentUrl,
        price: price,
        stop_price: null,
        quantity: quantity,
        side: 'buy',
        symbol: symbol,
        time_in_force: 'gfd',
        trigger: 'immediate',
        type: type,
        extended_hours: extendedHours
      }
    });
  }

  getInstruments(symbol, reply) {
    Robinhood().instruments(symbol, (error, response, body) => {
      if (error) {
        console.error(error);
        reply.status(500).send(error);
      } else {
        reply.status(200).send(body);
      }
    });
  }

  renewTDAuth() {
    return this.getTDAccessToken();
  }

  getIntraday(symbol) {
    if (!this.access_token) {
      return this.renewTDAuth()
        .then(() => this.getTDIntraday(symbol))
    } else {

      return this.getTDIntraday(symbol)
        .catch(() => {
          return this.renewTDAuth()
            .then(() => this.getTDIntraday(symbol));
        });
    }
  }

  getTDIntraday(symbol) {
    const query = `${tda}marketdata/${symbol}/pricehistory`;
    const options = {
      uri: query,
      qs: {
        apikey: tdaKey,
        periodType: 'day',
        period: 2,
        frequencyType: 'minute',
        frequency: 1,
        endDate: Date.now(),
        needExtendedHoursData: false
      },
      headers: {
        Authorization: `Bearer ${this.access_token}`
      }
    };

    return request.get(options)
      .then((data) => {
        const response = this.processTDData(data);
        return QuoteService.convertTdIntraday(response.candles);
      })
  }

  getDailyQuotes(symbol, startDate, endDate) {
    if (!this.access_token) {
      return this.renewTDAuth()
        .then(() => this.getTDDailyQuotes(symbol, startDate, endDate))
    } else {
      return this.getTDDailyQuotes(symbol, startDate, endDate)
        .catch(() => {
          return this.renewTDAuth()
            .then(() => this.getTDDailyQuotes(symbol, startDate, endDate));
        });
    }
  }

  getTDDailyQuotes(symbol, startDate, endDate) {
    const query = `${tda}marketdata/${symbol}/pricehistory`;
    const options = {
      uri: query,
      qs: {
        apikey: tdaKey,
        periodType: 'month',
        frequencyType: 'daily',
        frequency: 1,
        startDate: startDate,
        endDate: endDate,
        needExtendedHoursData: false
      },
      headers: {
        Authorization: `Bearer ${this.access_token}`
      }
    };

    return request.get(options)
      .then((data) => {
        const response = this.processTDData(data);
        return QuoteService.convertTdIntraday(response.candles);
      })
  }

  getTDMarketData(symbol) {
    const query = `${tda}marketdata/${symbol}/quotes`;
    const options = {
      uri: query,
      qs: {
        apikey: tdaKey
      },
      headers: {
        Authorization: `Bearer ${this.access_token}`
      }
    };
    return request.get(options);
  }

  processTDData(data) {
    return JSON.parse(data);
  }

  getTDAccessToken() {
    return request.post({
      uri: tda + 'oauth2/token',
      form: {
        grant_type: 'refresh_token',
        refresh_token: tdaRefreshToken,
        client_id: `${tdaKey}@AMER.OAUTHAP`
      }
    })
      .then(this.processTDData)
      .then(EASObject => {
        this.access_token = EASObject.access_token;
        return this.access_token;
      });
  }

  renewExpiredTDAccessTokenAndGetQuote(symbol) {
    return this.getTDAccessToken()
      .then((token) => {
        return this.getTDMarketData(symbol)
          .then(this.processTDData);

      });
  }

  checkTdAccess() {
    if (!this.access_token) {
      return this.renewTDAuth()
        .then(() => this.getTDIntraday(symbol))
    } else {
      return this.getTDIntraday(symbol)
        .catch(() => {
          return this.renewTDAuth()
            .then(() => this.getTDIntraday(symbol));
        });
    }
  }

  checkTdAccess(fn) {
    if (!this.access_token) {
      return this.renewTDAuth();
    } else {
      return this.getTDIntraday(symbol)
        .catch(() => {
          return this.renewTDAuth();
        });
    }
  }

  sendTdBuyOrder(symbol,
    quantity,
    price,
    type = 'LIMIT',
    extendedHours = false) {
    return this.renewTDAuth()
      .then(() => {
        return this.tdBuy(symbol,
          quantity,
          price,
          type,
          extendedHours);
      });
  }

  tdBuy(symbol,
    quantity,
    price,
    type = 'LIMIT',
    extendedHours = false) {
    let headers = {
      'Accept': '*/*',
      'Accept-Encoding': 'gzip',
      'Accept-Language': 'en-US',
      'Authorization': `Bearer ${this.access_token}`,
      'Content-Type': 'application/json',
    };

    const options = {
      uri: tda + `accounts/${tdAccountId}/orders`,
      headers: headers,
      json: true,
      gzip: true,
      body: {
        orderType: type,
        session: extendedHours? 'SEAMLESS' : 'NORMAL',
        duration: 'DAY',
        orderStrategyType: 'SINGLE',
        price: price,
        taxLotMethod: 'LIFO',
        orderLegCollection: [
          {
            instruction: 'Buy',
            quantity: quantity,
            instrument: {
              symbol: symbol,
              assetType: 'EQUITY'
            }
          }
        ]
      }
    };

    return request.post(options);
  }

  sendTdSellOrder(symbol,
    quantity,
    price,
    type = 'LIMIT',
    extendedHours = false) {
    return this.renewTDAuth()
      .then(() => {
        return this.tdSell(symbol,
          quantity,
          price,
          type,
          extendedHours);
      });
  }

  tdSell(symbol,
    quantity,
    price,
    type = 'LIMIT',
    extendedHours = false) {
    let headers = {
      'Accept': '*/*',
      'Accept-Encoding': 'gzip',
      'Accept-Language': 'en-US',
      'Authorization': `Bearer ${this.access_token}`,
      'Content-Type': 'application/json',
    };

    const options = {
      uri: tda + `accounts/${tdAccountId}/orders`,
      headers: headers,
      json: true,
      gzip: true,
      body: {
        orderType: type,
        session: extendedHours? 'SEAMLESS' : 'NORMAL',
        duration: 'DAY',
        orderStrategyType: 'SINGLE',
        price: price,
        taxLotMethod: 'LIFO',
        orderLegCollection: [
          {
            instruction: 'Sell',
            quantity: quantity,
            instrument: {
              symbol: symbol,
              assetType: 'EQUITY'
            }
          }
        ]
      }
    };

    return request.post(options);
  }

  getTdPositions() {
    return this.renewTDAuth()
      .then(() => {
        return this.sendTdPositionRequest()
          .then((pos) => {
            return pos.securitiesAccount.positions
          });
      });
  }

  getTdBalance() {
    return this.renewTDAuth()
      .then(() => {
        return this.sendTdPositionRequest()
          .then((pos) => {
            return pos.securitiesAccount.currentBalances.buyingPower;
          });
      });
  }

  sendTdPositionRequest() {
    const query = `${tda}accounts/${tdAccountId}`;
    const options = {
      uri: query,
      qs: {
        fields: 'positions'
      },
      headers: {
        Authorization: `Bearer ${this.access_token}`
      }
    };

    return request.get(options)
      .then((data) => {
        return this.processTDData(data);
      })
  }
}

export default new PortfolioService();
