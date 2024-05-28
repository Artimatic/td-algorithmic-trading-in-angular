import * as request from 'request-promise';
import * as Robinhood from 'robinhood';
import * as _ from 'lodash';
import * as moment from 'moment';
import axios from 'axios';
import * as qs from 'qs';

import QuoteService from '../quote/quote.service';
import * as configurations from '../../config/environment';

const charlesSchwabUrl = 'https://api.schwabapi.com/v1/';
const charlesSchwabTraderUrl = 'https://api.schwabapi.com/trader/v1/';
const charlesSchwabMarketDataUrl = 'https://api.schwabapi.com/marketdata/v1/';

interface TokenInfo {
  timestamp: number;
  token: string;
}

class PortfolioService {
  access_token: { [key: string]: TokenInfo } = {};
  refreshTokensHash = {};
  accountIdToHash = {};
  appKey = {};
  secret = {};
  lastTokenRequest = null;

  login(consumerKey, callbackUrl, reply) {
    const path = '/oauth/authorize';
    const url = `${charlesSchwabUrl}${path}?client_id=${consumerKey}&redirect_uri=${callbackUrl}`;
    return axios({
      method: 'get',
      url
    }).then(response => {
        reply.status(200).send((response as any).json());
      })
      .catch((e) => {
        if (e.request && e.request._redirectable && e.request._redirectable._options && e.request._redirectable._options.href) {
          reply.redirect(e.request._redirectable._options.href);
        } else {
          reply.status(500).send(e);
        }
      });
  }

  getAccessToken(accountId, appKey, secret, code, callbackUrl, reply) {
    const path = '/oauth/token'
    const url = `${charlesSchwabUrl}${path}`;
    const data = {
      grant_type: 'authorization_code',
      code,
      redirect_uri: callbackUrl
    };
  
    const auth = Buffer.from(`${accountId}:${secret}`).toString('base64');
  
    const options = {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${auth}`
      },
      data: qs.stringify(data),
      url
    };
    return axios(options)
      .then((response) => {
        const data = (response as any).data;
        this.getAccountNumbers(data?.access_token)
          .then(accountNumbers => {
            accountNumbers.forEach(val => {
              this.accountIdToHash[val.accountNumber] = val.hashValue;
            });
            this.refreshTokensHash[accountId] = (data?.refresh_token as string) || null;
            this.access_token[accountId] = {
              timestamp: moment().valueOf(),
              token: data?.access_token || null
            };
            this.appKey[accountId] = appKey;
            this.secret[accountId] = secret;
          });

        reply.status(200).send(data);
      })
      .catch((e) => {
        if (e.toJSON) {
          const error = e.toJSON();
          console.log('error:', JSON.stringify(error));
          reply.status(error.status).send(error);
        } else {
          reply.status(500).send(e);
        }
      });
  }

  refreshAccessToken(accountId) {
    const token = Buffer.from(`${this.appKey[accountId]}:${this.secret[accountId]}`).toString('base64');
    const data = {
      grant_type: 'refresh_token',
      refresh_token: this.refreshTokensHash[accountId]
    };
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${token}`
      },
      data: qs.stringify(data),
      url: charlesSchwabUrl + 'oauth/token',
    };
    return axios(options)
      .then((response) => {
        const data = (response as any).data;
        this.refreshTokensHash[accountId] = (data?.refresh_token as string) || null;
        this.access_token[accountId] = {
          timestamp: moment().valueOf(),
          token: data?.access_token || null
        }
      })
      .catch((e) => {
        if (e.toJSON) {
          const error = e.toJSON();
          console.log('error refreshing token:', JSON.stringify(error));
        }
      });
  }

  getAccountNumbers(token) {
    const url = `${charlesSchwabTraderUrl}accounts/accountNumbers`;

    const options = {
      uri: url,
      headers: {
        Authorization: `Bearer ${token}`
      }
    };

    return request.get(options)
      .then(this.processData);
  }

  getQuote(symbol, accountId, response) {
    if (!this.access_token[accountId]) {
      return this.renewExpiredAccessTokenAndGetQuote(symbol, accountId, response);
    } else {
      return this.getMarketData(symbol, accountId)
        .then(this.processData)
        .then(quote => {
          if (quote[symbol].delayed) {
            return this.renewExpiredAccessTokenAndGetQuote(symbol, accountId, response);
          } else {
            return quote;
          }
        })
        .catch(error => this.renewExpiredAccessTokenAndGetQuote(symbol, accountId, response));
    }
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

  renewAuth(accountId, reply = null) {
    if (accountId === null) {
      for (const id in this.access_token) {
        if (id && id !== 'null' && this.access_token[id]) {
          console.log('Account ID: ', id);
          accountId = id;
        }
      }
    }

    if (!accountId) {
      return Promise.reject(new Error('Missing accountId'));
    }

    if (this.access_token[accountId]) {
      const diffMinutes = moment().diff(moment(this.access_token[accountId].timestamp), 'minutes');
      console.log('Found access token ', diffMinutes, new Date().toString());

      if (diffMinutes < 30) {
        return Promise.resolve();
      } else {
        console.log('Access token expired.');
      }
    } else if (!this.access_token[accountId]) {
      this.access_token[accountId] = { token: '123', timestamp: moment().valueOf() };
    }
    return this.sendPositionRequest(accountId).then(pos => {
      console.log('Added new token');
      return Promise.resolve();
    })
      .catch(error => {
        console.log('Potential token error: ', error);
        const diffMinutes = moment().diff(moment(this.access_token[accountId].timestamp), 'minutes');

        if (!diffMinutes || diffMinutes >= 30) {
          console.log('Last token request: ', moment(this.lastTokenRequest).format());
          if (this.access_token[accountId] && (this.lastTokenRequest === null || moment().diff(moment(this.lastTokenRequest), 'minutes') > 29)) {
            this.lastTokenRequest = moment().valueOf();
            console.log('Requesting new token');
            return this.refreshAccessToken(accountId);
          } else {
            const tooRecentErrMsg = 'Last token request was too recent';
            console.log(tooRecentErrMsg);
            if (reply) {
              reply.status(500).send({ error: tooRecentErrMsg });
              reply.end();
            }
            return Promise.reject(new Error('Last token request was too recent'));
          }
        }
        return Promise.reject(new Error('Unknown error'));
      });
  }

  getIntraday(symbol, accountId, reply) {
    console.log(moment().format(), 'Retrieving intraday quotes ');
    if (!accountId || !this.access_token[accountId]) {
      console.log('missing access token for ', accountId, this.access_token);
      return this.renewAuth(accountId, reply)
        .then(() => this.getTDIntraday(symbol, accountId));
    } else {
      return this.getTDIntraday(symbol, accountId)
        .catch((error) => {
          console.log('Error retrieving intraday data ', error.error);

          return this.renewAuth(accountId, reply)
            .then(() => this.getTDIntraday(symbol, accountId));
        });
    }
  }

  getTDIntraday(symbol, accountId) {
    if (!accountId) {
      accountId = this.getAccountId();
    }

    const query = `${charlesSchwabMarketDataUrl}pricehistory`;
    const options = {
      uri: query,
      qs: {
        symbol,
        periodType: 'day',
        period: 2,
        frequencyType: 'minute',
        frequency: 1,
        endDate: Date.now()
      },
      headers: {
        Authorization: `Bearer ${this.access_token[accountId].token}`
      }
    };

    return request.get(options)
      .then((data) => {
        const response = this.processData(data);
        return QuoteService.convertTdIntraday(response.candles);
      });
  }

  getIntradayV2(symbol, period = 2, frequencyType = 'minute', frequency = 1, reply = null) {
    return this.renewAuth(null, reply)
      .then(() => this.getTDIntradayV2(symbol, period, frequencyType, frequency));
  }

  getAccountId() {
    let accountId = configurations.tdameritrade.accountId;
    if (accountId) {
      return accountId;
    } else {
      for (const id in this.access_token) {
        if (id && id !== 'null' && this.access_token[id]) {
          accountId = id;
        }
      }
    }
    console.log('Using account id ', accountId);
    return accountId;
  }

  getTDIntradayV2(symbol, period, frequencyType, frequency) {
    const accountId = this.getAccountId();

    if (!this.access_token[accountId] || !this.access_token[accountId].token) {
      return new Error('Token missing');
    }

    const query = `${charlesSchwabMarketDataUrl}pricehistory`;
    const options = {
      uri: query,
      qs: {
        symbol,
        periodType: 'day',
        period,
        frequencyType,
        frequency,
        endDate: Date.now()
      },
      headers: {
        Authorization: `Bearer ${this.access_token[accountId].token}`
      }
    };

    return request.get(options)
      .then((data) => {
        return this.processData(data);
      });
  }

  getIntradayV3(symbol, startDate = moment().subtract({ days: 1 }).valueOf(), endDate = moment().valueOf(), reply = null) {
    return this.renewAuth(null, reply)
      .then(() => this.getTDIntradayV3(symbol, moment(startDate).valueOf(), moment(endDate).valueOf()));
  }

  getTDIntradayV3(symbol, startDate, endDate) {
    const accountId = this.getAccountId();

    const query = `${charlesSchwabMarketDataUrl}pricehistory`;
    const options = {
      uri: query,
      qs: {
        symbol,
        periodType: 'day',
        period: 2,
        frequencyType: 'minute',
        frequency: 1,
        startDate,
        endDate
      },
      headers: {
        Authorization: `Bearer ${this.access_token[accountId].token}`
      }
    };

    return request.get(options)
      .then((data) => {
        const response = this.processData(data);
        return QuoteService.convertTdIntradayV2(symbol, response.candles);
      })
      .catch(error => {
        console.log('Error on getTDIntradayV3 request ', error);
        console.log('getTDIntradayV3 request ', symbol, startDate, endDate);

        return error;
      });
  }

  getDailyQuotes(symbol, startDate, endDate, accountId, reply) {
    console.log(moment().format(), 'Retrieving daily quotes ');

    if (!this.access_token[accountId]) {
      console.log('missing access token');

      return this.renewAuth(accountId, reply)
        .then(() => this.getTDDailyQuotes(symbol, startDate, endDate, accountId));
    } else {
      return this.getTDDailyQuotes(symbol, startDate, endDate, accountId)
        .catch(error => {
          console.log(moment().format(), 'Error retrieving daily quotes ', error.error);

          return this.renewAuth(accountId, reply)
            .then(() => this.getTDDailyQuotes(symbol, startDate, endDate, accountId));
        });
    }
  }

  getDailyQuoteInternal(symbol, startDate, endDate, response = null) {
    let accountId;
    const accountIds = Object.getOwnPropertyNames(this.refreshTokensHash);
    if (accountIds.length > 0) {
      accountId = accountIds[0];
    } else {
      accountId = this.getAccountId();
    }
    if (!accountId) {
      console.log('Missing accountId');
    }
    return this.getDailyQuotes(symbol, startDate, endDate, accountId, response);
  }

  getTDDailyQuotes(symbol, startDate, endDate, accountId) {
    const query = `${charlesSchwabMarketDataUrl}pricehistory`;
    const options = {
      uri: query,
      qs: {
        symbol,
        periodType: 'month',
        frequencyType: 'daily',
        frequency: 1,
        startDate: startDate,
        endDate: endDate
      },
      headers: {
        Authorization: `Bearer ${this.access_token[accountId].token}`
      }
    };

    return request.get(options)
      .then((data) => {
        const response = this.processData(data);
        return QuoteService.convertTdIntraday(response.candles);
      });
  }

  getMarketData(symbol, accountId) {
    const query = `${charlesSchwabMarketDataUrl}${symbol}/quotes`;
    const options = {
      uri: query,
      qs: {
        fields: 'quote'
      },
      headers: {
        Authorization: `Bearer ${this.access_token[accountId].token}`
      }
    };
    return request.get(options);
  }

  processData(data) {
    return JSON.parse(data);
  }

  renewExpiredAccessTokenAndGetQuote(symbol, accountId, response) {
    return this.renewAuth(accountId, response)
      .then(() => {
        return this.getMarketData(symbol, accountId || this.getAccountId())
          .then(this.processData);
      });
  }

  sendTdBuyOrder(symbol,
    quantity,
    price,
    type = 'LIMIT',
    extendedHours = false, accountId, response) {
    return this.renewAuth(accountId, response)
      .then(() => {
        return this.tdBuy(symbol,
          quantity,
          price,
          type,
          extendedHours, accountId);
      });
  }


  sendTwoLegOrder(primarySymbol,
    seconarySymbol,
    quantity,
    price,
    type = 'NET_DEBIT',
    extendedHours = false, accountId, response) {
    return this.renewAuth(accountId, response)
      .then(() => {
        return this.tdTwoLegOrder(primarySymbol,
          seconarySymbol,
          quantity,
          price,
          type,
          extendedHours, accountId);
      });
  }

  tdTwoLegOrder(primaryLegSymbol,
    secondaryLegSymbol,
    quantity,
    price,
    type,
    extendedHours = false, accountId) {
    const headers = {
      'Accept': '*/*',
      'Accept-Encoding': 'gzip',
      'Accept-Language': 'en-US',
      'Authorization': `Bearer ${this.access_token[accountId].token}`,
      'Content-Type': 'application/json',
    };

    const options = {
      uri: charlesSchwabTraderUrl + `accounts/${this.accountIdToHash[accountId]}/orders`,
      headers: headers,
      json: true,
      gzip: true,
      body: {
        orderType: type,
        session: extendedHours ? 'SEAMLESS' : 'NORMAL',
        duration: 'DAY',
        orderStrategyType: 'SINGLE',
        complexOrderStrategyType: 'CUSTOM',
        price: price,
        orderLegCollection: [
          {
            instruction: 'BUY_TO_OPEN',
            quantity: quantity,
            instrument: {
              symbol: primaryLegSymbol,
              assetType: 'OPTION'
            }
          },
          {
            instruction: 'BUY_TO_OPEN',
            quantity: quantity,
            instrument: {
              symbol: secondaryLegSymbol,
              assetType: 'OPTION'
            }
          }
        ]
      }
    };

    return request.post(options);
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
      'Authorization': `Bearer ${this.access_token[accountId].token}`,
      'Content-Type': 'application/json',
    };

    const options = {
      uri: charlesSchwabTraderUrl + `accounts/${this.accountIdToHash[accountId]}/orders`,
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
            instruction: 'BUY',
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
    extendedHours = false, accountId, response) {
    return this.renewAuth(accountId, response)
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
      'Authorization': `Bearer ${this.access_token[accountId].token}`,
      'Content-Type': 'application/json',
    };

    const options = {
      uri: charlesSchwabTraderUrl + `accounts/${this.accountIdToHash[accountId]}/orders`,
      headers: headers,
      json: true,
      gzip: true,
      body: {
        orderType: type,
        session: extendedHours ? 'SEAMLESS' : 'NORMAL',
        duration: 'DAY',
        orderStrategyType: 'SINGLE',
        taxLotMethod: 'LIFO',
        orderLegCollection: [
          {
            instruction: 'SELL',
            quantity: quantity,
            instrument: {
              symbol: symbol,
              assetType: 'EQUITY'
            }
          }
        ]
      }
    };

    if (type === 'limit') {
      options.body['price'] = price;
    }

    return request.post(options);
  }

  getPositions(accountId) {
    return this.sendPositionRequest(accountId)
      .then((pos) => {
        return pos.securitiesAccount.positions;
      });
  }

  getTdBalance(accountId, response) {
    return this.renewAuth(accountId, response)
      .then(() => {
        return this.sendPositionRequest(accountId)
          .then((pos) => {
            return pos.securitiesAccount.currentBalances;
          });
      });
  }

  sendPositionRequest(accountId) {
    const query = `${charlesSchwabTraderUrl}accounts/${this.accountIdToHash[accountId]}`;
    const options = {
      uri: query,
      qs: {
        fields: 'positions'
      },
      headers: {
        Authorization: `Bearer ${this.access_token[accountId].token}`
      }
    };

    return request.get(options)
      .then((data) => {
        return this.processData(data);
      });
  }

  setCredentials(accountId, key, refreshToken, response) {
    this.refreshTokensHash[accountId] = refreshToken;
    response.status(200).send();
  }

  isSet(accountId, response) {
    const isSet = !_.isNil(this.refreshTokensHash[accountId]) && !_.isNil(this.accountIdToHash[accountId]);

    if (isSet) {
      response.status(200).send(isSet);
    } else {
      response.status(404).send(isSet);
    }
  }

  deleteCredentials(accountId, response) {
    this.refreshTokensHash[accountId] = null;
    this.access_token[accountId] = null;
    this.lastTokenRequest = null;
    response.status(200).send({});
  }

  getOptionsStrangle(accountId, symbol, strikeCount, optionType = 'S', response) {
    if (!accountId) {
      accountId = this.getAccountId();
    }

    return this.renewAuth(accountId, response)
      .then(() => {
        const query = `${charlesSchwabMarketDataUrl}chains`;
        const options = {
          uri: query,
          qs: {
            symbol,
            strikeCount,
            strategy: 'STRADDLE',
            range: 'SNK',
            optionType
          },
          headers: {
            Authorization: `Bearer ${this.access_token[accountId].token}`
          }
        };
        return request.get(options)
          .then((data) => {
            return this.processData(data);
          });
      });
  }

  getEquityMarketHours(date: string) {
    const accountId = this.getAccountId();

    const query = `${charlesSchwabMarketDataUrl}markets`;
    const options = {
      uri: query,
      qs: {
        markets: 'equity',
        date
      },
      headers: {
        Authorization: `Bearer ${this.access_token[accountId].token}`
      }
    };

    return request.get(options)
      .then(this.processData);
  }

  getInstrument(cusip: string) {
    const accountId = this.getAccountId();

    //const query = `${tdaUrl}instruments/${cusip}`;
    const url = `${charlesSchwabMarketDataUrl}instruments?symbol=${cusip}&projection=fundamental`;

    const options = {
      uri: url,
      headers: {
        Authorization: `Bearer ${this.access_token[accountId].token}`
      }
    };

    return request.get(options)
      .then(this.processData);
  }
}

export default new PortfolioService();
