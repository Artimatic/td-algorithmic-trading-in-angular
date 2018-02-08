import moment from 'moment';
import json2csv from 'json2csv';
import fs from 'fs';
import request from 'request-promise';

import Robinhood from 'robinhood';

import * as errors from '../../components/errors/baseErrors';

const RobinHoodApi = require('robinhood-api');
const robinhood = new RobinHoodApi();

const apiUrl = 'https://api.robinhood.com/';

class PortfolioService {
  login(username, password, reply) {
    (async () => {
      try {
        let loginResult = await robinhood.login({ username: username, password: password });
        reply.status(200).send({});
      } catch (e) {
        console.log('Oh noes! Login probably failed!', e);
        reply.status(401).send(e);
      }
    })();
  }

  mfaLogin(username, password, code, reply) {
    (async () => {
      try {
        let loginResult = await robinhood.mfaCode({ username: username, password: password, mfa_code: code });
        reply.status(200).send(loginResult);
      } catch (e) {
        console.log('Oh noes! Login probably failed!', e);
        reply.status(401).send(e);
      }
    })();
  }

  expireToken(token, reply) {
    Robinhood({ token: token }).expire_token((error, response, body) => {
      if (error) {
        console.error(error);
        reply.status(500).send(error);

      } else {
        reply.status(200).send(body);
      }
    });
  }

  getPortfolio(token, reply) {
    Robinhood({ token: token }).accounts((error, response, body) => {
      if (error) {
        console.error(error);
        reply.status(500).send(error);
      } else {
        reply.status(200).send(body);
      }
    });
  }

  getPositions(token, reply) {
    Robinhood({ token: token }).nonzero_positions((error, response, body) => {
      if (error) {
        console.error(error);
        reply.status(500).send(error);
      } else {
        reply.status(200).send(body);
      }
    });
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

  sell(account, token, instrumentUrl, symbol, quantity, price, reply) {
    let headers = {
      'Accept': '*/*',
      'Accept-Encoding': 'gzip, deflate',
      'Accept-Language': 'en;q=1, fr;q=0.9, de;q=0.8, ja;q=0.7, nl;q=0.6, it;q=0.5',
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
      'Connection': 'keep-alive',
      'X-Robinhood-API-Version': '1.152.0',
      'User-Agent': 'Robinhood/5.32.0 (com.robinhood.release.Robinhood; build:3814; iOS 10.3.3)',
      'Authorization': `Token ${token}`
  };

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
        type: 'limit'
      }
    });
  }
}

module.exports.PortfolioService = new PortfolioService();
