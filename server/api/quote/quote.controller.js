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
      QuoteService.getData(request.body.ticker, request.body.interval, request.body.range)
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
      QuoteService.getRawData(request.body.ticker, request.body.interval, request.body.range)
        .then((data) => BaseController.requestGetSuccessHandler(response, data))
        .catch((e) => BaseController.requestErrorHandler(response, e));
    }
  }

  getIntraday(request, response) {
    if (_.isEmpty(request.body)) {
      return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
    }
    else {
      QuoteService.getIntradayData(request.body.symbol, request.body.interval)
        .then((data) => BaseController.requestGetSuccessHandler(response, data))
        .catch((e) => BaseController.requestErrorHandler(response, e));
    }
  }

  getIntradayV2(request, response) {
    if (_.isEmpty(request.body)) {
      return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
    }
    else {
      QuoteService.getIntradayDataV2(request.body.symbol, request.body.interval)
        .then((data) => BaseController.requestGetSuccessHandler(response, data))
        .catch((e) => BaseController.requestErrorHandler(response, e));
    }
  }

  getCompanySummary(request, response) {
    if (_.isEmpty(request.body)) {
      return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
    }
    else {
      QuoteService.getCompanySummary(request.body.symbol)
        .then((data) => BaseController.requestGetSuccessHandler(response, data))
        .catch((e) => BaseController.requestErrorHandler(response, e));
    }
  }

  getOptionChain(request, response) {
    if (_.isEmpty(request.body)) {
      return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
    }
    else {
      QuoteService.getOptionChain(request.body.symbol)
        .then((data) => BaseController.requestGetSuccessHandler(response, data))
        .catch((e) => BaseController.requestErrorHandler(response, e));
    }
  }
}

module.exports = new QuoteController();
