import * as _ from 'lodash';
import * as Boom from 'boom';
import * as  moment from 'moment';

import BaseController from '../../api/templates/base.controller';
import { QuoteService } from './quote.service';

const errors = require('../../components/errors/baseErrors');

const Schema = require('./quote.model');

class QuoteController extends BaseController {

  constructor() {
    super();
  }

  getQuote(request, response) {
    if (_.isEmpty(request.body)) {
      return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
    }
    else {
      QuoteService.getData(request.body.ticker, request.body.start, request.body.end)
        .then((data) => BaseController.requestGetSuccessHandler(response, data))
        .catch((e) => BaseController.requestErrorHandler(response, e));
    }
  }

  getCurrentQuote(request, response) {
    if (_.isEmpty(request.body)) {
      return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
    }
    else {
      QuoteService.getLastPrice(request.body.tickers)
        .then((data) => BaseController.requestGetSuccessHandler(response, data))
        .catch((e) => BaseController.requestErrorHandler(response, e));
    }
  }

  getRawData(request, response) {
    if (_.isEmpty(request.body)) {
      return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
    }
    else {
      QuoteService.getRawData(request.body.ticker, request.body.start, request.body.end)
        .then((data) => BaseController.requestGetSuccessHandler(response, data))
        .catch((e) => BaseController.requestErrorHandler(response, e));
    }
  }
}

module.exports = new QuoteController();
