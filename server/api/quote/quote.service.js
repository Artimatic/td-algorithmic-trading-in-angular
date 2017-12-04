import google from '../../components/google-finance';
import _ from 'lodash';
import moment from 'moment';

import { feedQuandl } from 'd3fc-financial-feed';
const Boom = require('boom');

import errors from '../../components/errors/baseErrors';

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

module.exports = new QuoteService();
