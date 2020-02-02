import * as request from 'request-promise';
import * as Robinhood from 'robinhood';
import * as _ from 'lodash';
const RobinHoodApi = require('robinhood-api');
const robinhood = new RobinHoodApi();

import QuoteService from '../quote/quote.service';
import configurations from '../../config/environment';

const robinhoodDevice = {
  deviceToken: configurations.robinhood.deviceId
};

const apiUrl = 'https://api.robinhood.com/';
const tdaUrl = 'https://api.tdameritrade.com/v1/';

class PortfolioService {

  access_token = {};
  tdaKey = {};
  refreshToken = {};

  login(username, password, reply) {
    const options = {
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
        device_token: robinhoodDevice.deviceToken,
        scope: 'internal'
      }
    };

    return request.post(options)
      .then(() => reply.status(200).send({}))
      .catch((e) => (reply.status(401).send(e)));
  }

  mfaLogin(username, password, code, reply) {
    const options = {
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
        device_token: robinhoodDevice.deviceToken,
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
        const inst = await robinhood.getResource(instrument);
        reply.status(200).send(inst);
      } catch (e) {
        reply.status(500).send(e);
      }
    })();
  }

  getQuote(symbol, accountId) {
    if (!this.access_token[accountId]) {
      return this.renewExpiredTDAccessTokenAndGetQuote(symbol, accountId);
    } else {
      return this.getTDMarketData(symbol, accountId)
        .then(this.processTDData)
        .then(quote => {
          if (quote[symbol].delayed) {
            return this.renewExpiredTDAccessTokenAndGetQuote(symbol, accountId);
          } else {
            return quote;
          }
        })
        .catch(error => this.renewExpiredTDAccessTokenAndGetQuote(symbol, accountId));
    }
  }

  sell(account, token, instrumentUrl, symbol, quantity, price, type = 'limit',
    extendedHours = false) {
    const headers = {
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
    const headers = {
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

  renewTDAuth(accountId) {
    return this.getTDAccessToken(accountId);
  }

  getIntraday(symbol, accountId) {
    if (!this.access_token[accountId]) {
      return this.renewTDAuth(accountId)
        .then(() => this.getTDIntraday(symbol, accountId));
    } else {
      return this.getTDIntraday(symbol, accountId)
        .catch(() => {
          return this.renewTDAuth(accountId)
            .then(() => this.getTDIntraday(symbol, accountId));
        });
    }
  }

  getTDIntraday(symbol, accountId) {
    const query = `${tdaUrl}marketdata/${symbol}/pricehistory`;
    const options = {
      uri: query,
      qs: {
        apikey: this.tdaKey[accountId],
        periodType: 'day',
        period: 2,
        frequencyType: 'minute',
        frequency: 1,
        endDate: Date.now(),
        needExtendedHoursData: false
      },
      headers: {
        Authorization: `Bearer ${this.access_token[accountId]}`
      }
    };

    return request.get(options)
      .then((data) => {
        const response = this.processTDData(data);
        return QuoteService.convertTdIntraday(response.candles);
      });
  }

  getDailyQuotes(symbol, startDate, endDate, accountId) {
    if (!this.access_token[accountId]) {
      return this.renewTDAuth(accountId)
        .then(() => this.getTDDailyQuotes(symbol, startDate, endDate, accountId));
    } else {
      return this.getTDDailyQuotes(symbol, startDate, endDate, accountId)
        .catch(() => {
          return this.renewTDAuth(accountId)
            .then(() => this.getTDDailyQuotes(symbol, startDate, endDate, accountId));
        });
    }
  }

  getDailyQuoteInternal(symbol, startDate, endDate) {
    let accountId;
    const accountIds = Object.getOwnPropertyNames(this.refreshToken);
    if (accountIds.length > 0) {
      accountId = accountIds[0];
    } else if (configurations.tdameritrade.accountId) {
      accountId = configurations.tdameritrade.accountId;
    } else {
      console.log('Missing accountId');
    }
    return this.getDailyQuotes(symbol, startDate, endDate, accountId);
  }

  getTDDailyQuotes(symbol, startDate, endDate, accountId) {
    const query = `${tdaUrl}marketdata/${symbol}/pricehistory`;
    const options = {
      uri: query,
      qs: {
        apikey: this.tdaKey[accountId],
        periodType: 'month',
        frequencyType: 'daily',
        frequency: 1,
        startDate: startDate,
        endDate: endDate,
        needExtendedHoursData: false
      },
      headers: {
        Authorization: `Bearer ${this.access_token[accountId]}`
      }
    };

    return request.get(options)
      .then((data) => {
        const response = this.processTDData(data);
        return QuoteService.convertTdIntraday(response.candles);
      });
  }

  getTDMarketData(symbol, accountId) {
    const query = `${tdaUrl}marketdata/${symbol}/quotes`;
    const options = {
      uri: query,
      qs: {
        apikey: this.tdaKey[accountId]
      },
      headers: {
        Authorization: `Bearer ${this.access_token[accountId]}`
      }
    };
    return request.get(options);
  }

  processTDData(data) {
    return JSON.parse(data);
  }

  getTDAccessToken(accountId) {
    let refreshToken;
    let key;
    if (!accountId ||
      !this.refreshToken[accountId] || !this.tdaKey[accountId]) {
      accountId = configurations.tdameritrade.accountId;
      key = configurations.tdameritrade.consumer_key;
      refreshToken = configurations.tdameritrade.refresh_token;
    } else {
      refreshToken = this.refreshToken[accountId];
      key = this.tdaKey[accountId];
    }

    return request.post({
      uri: tdaUrl + 'oauth2/token',
      form: {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: `${key}@AMER.OAUTHAP`
      }
    })
      .then(this.processTDData)
      .then(EASObject => {
        this.access_token[accountId] = EASObject.access_token;
        return this.access_token[accountId];
      });
  }

  renewExpiredTDAccessTokenAndGetQuote(symbol, accountId) {
    return this.getTDAccessToken(accountId)
      .then((token) => {
        return this.getTDMarketData(symbol, accountId)
          .then(this.processTDData);
      });
  }

  sendTdBuyOrder(symbol,
    quantity,
    price,
    type = 'LIMIT',
    extendedHours = false, accountId) {
    return this.renewTDAuth(accountId)
      .then(() => {
        return this.tdBuy(symbol,
          quantity,
          price,
          type,
          extendedHours, accountId);
      });
  }

  tdBuy(symbol,
    quantity,
    price,
    type = 'LIMIT',
    extendedHours = false, accountId) {
    const headers = {
      'Accept': '*/*',
      'Accept-Encoding': 'gzip',
      'Accept-Language': 'en-US',
      'Authorization': `Bearer ${this.access_token[accountId]}`,
      'Content-Type': 'application/json',
    };

    const options = {
      uri: tdaUrl + `accounts/${accountId}/orders`,
      headers: headers,
      json: true,
      gzip: true,
      body: {
        orderType: type,
        session: extendedHours ? 'SEAMLESS' : 'NORMAL',
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
    extendedHours = false, accountId) {
    return this.renewTDAuth(accountId)
      .then(() => {
        return this.tdSell(symbol,
          quantity,
          price,
          type,
          extendedHours, accountId);
      });
  }

  tdSell(symbol,
    quantity,
    price,
    type = 'LIMIT',
    extendedHours = false, accountId) {
    const headers = {
      'Accept': '*/*',
      'Accept-Encoding': 'gzip',
      'Accept-Language': 'en-US',
      'Authorization': `Bearer ${this.access_token[accountId]}`,
      'Content-Type': 'application/json',
    };

    const options = {
      uri: tdaUrl + `accounts/${accountId}/orders`,
      headers: headers,
      json: true,
      gzip: true,
      body: {
        orderType: type,
        session: extendedHours ? 'SEAMLESS' : 'NORMAL',
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

  getTdPositions(accountId) {
    return this.renewTDAuth(accountId)
      .then(() => {
        return this.sendTdPositionRequest(accountId)
          .then((pos) => {
            return pos.securitiesAccount.positions;
          });
      });
  }

  getTdBalance(accountId) {
    return this.renewTDAuth(accountId)
      .then(() => {
        return this.sendTdPositionRequest(accountId)
          .then((pos) => {
            return pos.securitiesAccount.currentBalances;
          });
      });
  }

  sendTdPositionRequest(accountId) {
    const query = `${tdaUrl}accounts/${accountId}`;
    const options = {
      uri: query,
      qs: {
        fields: 'positions'
      },
      headers: {
        Authorization: `Bearer ${this.access_token[accountId]}`
      }
    };

    return request.get(options)
      .then((data) => {
        return this.processTDData(data);
      });
  }

  setCredentials(accountId, key, refreshToken, response) {
    this.refreshToken[accountId] = refreshToken;
    this.tdaKey[accountId] = key;
    response.status(200).send();
  }

  isSet(accountId, response) {
    const isSet = !_.isNil(this.refreshToken[accountId]) && !_.isNil(this.tdaKey[accountId]);

    if (isSet) {
      response.status(200).send(isSet);
    } else {
      response.status(404).send(isSet);
    }
  }

  deleteCredentials(accountId, response) {
    this.refreshToken[accountId] = null;
    this.tdaKey[accountId] = null;
    response.status(200).send({});
  }
}

export default new PortfolioService();
