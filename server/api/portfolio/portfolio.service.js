import moment from 'moment';
import json2csv from 'json2csv';
import fs from 'fs';

import * as errors from '../../components/errors/baseErrors';
const RobinHood = require('robinhood-api');
const robinhood = new RobinHood();
import credentials from '../../config/environment/credentials.js';

let session = {
  token: ''
};

class PortfolioService {
  login(reply) {
    (async () => {
      try{
        let loginResult = await robinhood.login({username: credentials.username, password: credentials.password});
        reply.status(200).send({});
      }catch(e){
        console.log('Oh noes! Login probably failed!', e);
      }
    })();
  }

  mfaLogin(code, reply) {
    console.log('login code: ', code);
    (async () => {
      try{
        let loginResult = await robinhood.mfaCode({username: credentials.username, password: credentials.password, mfa_code: code});
        reply.status(200).send(loginResult);
      }catch(e){
        console.log('Oh noes! Login probably failed!', e);
      }
    })();
  }

  getPortfolio(reply) {
    (async () => {
      try{
        let portfolioData = await robinhood.getPortfolio({account_number: credentials.account_number});
        reply.status(200).send(portfolioData);

      }catch(e){
        console.log('Oh noes! Login probably failed!', e);
      }
    })();
  }

  getPositions(reply) {
    (async () => {
      try{
        let positionData = await robinhood.getPositions({nonzero: true});
        reply.status(200).send(positionData);
      }catch(e){
        console.log('Oh noes! Login probably failed!', e);
      }
    })();
  }
}

module.exports.PortfolioService = new PortfolioService();