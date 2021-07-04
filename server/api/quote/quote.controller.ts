import * as _ from 'lodash';
import * as Boom from 'boom';

import BaseController from '../templates/base.controller';

import QuoteService from './quote.service';

class QuoteController extends BaseController {

  constructor() {
    super();
  }

  getQuote(request, response) {
    if (_.isEmpty(request.body)) {
      return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
    } else {
      QuoteService.getData(request.body.ticker, request.body.interval, request.body.range)
        .then((data) => BaseController.requestGetSuccessHandler(response, data))
        .catch((e) => BaseController.requestErrorHandler(response, e));
    }
  }

  getCurrentQuote(request, response) {
    if (_.isEmpty(request.body)) {
      return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
    } else {
      QuoteService.getLastPrice(request.body.symbol)
        .then((data) => BaseController.requestGetSuccessHandler(response, data))
        .catch((e) => BaseController.requestErrorHandler(response, e));
    }
  }

  getRawData(request, response) {
    if (_.isEmpty(request.body)) {
      return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
    } else {
      QuoteService.getRawData(request.body.symbol, request.body.interval, request.body.range)
        .then((data) => BaseController.requestGetSuccessHandler(response, data))
        .catch((e) => BaseController.requestErrorHandler(response, e));
    }
  }

  getIntraday(request, response) {
    if (_.isEmpty(request.body)) {
      return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
    } else {
      QuoteService.getIntradayData(request.body.symbol, request.body.interval)
        .then((data) => BaseController.requestGetSuccessHandler(response, data))
        .catch((e) => BaseController.requestErrorHandler(response, e));
    }
  }

  getTiingoIntraday(request, response) {
    if (_.isEmpty(request.body)) {
      return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
    } else {
      QuoteService.getTiingoIntraday(request.body.symbol, request.body.startDate)
        .then((data) => BaseController.requestGetSuccessHandler(response, data))
        .catch((e) => BaseController.requestErrorHandler(response, e));
    }
  }

  getIntradayV2(request, response) {
    if (_.isEmpty(request.body)) {
      return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
    } else {
      QuoteService.getIntradayDataV2(request.body.symbol, request.body.interval)
        .then((data) => BaseController.requestGetSuccessHandler(response, data))
        .catch((e) => BaseController.requestErrorHandler(response, e));
    }
  }

  findIntraday(request, response) {
    console.log('q: ', request.query);

    if (_.isEmpty(request.query)) {
      return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
    } else {
      console.log('q: ', request.query);
      QuoteService.queryForIntraday(request.query.symbol, request.query.from, request.query.to)
        .then((data) => BaseController.requestGetSuccessHandler(response, data))
        .catch((e) => BaseController.requestErrorHandler(response, e));
    }
  }

  postIntraday(request, response) {
    if (_.isEmpty(request.body)) {
      return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
    } else {
      QuoteService.postIntradayData(request.body)
        .then((data) => BaseController.requestGetSuccessHandler(response, data))
        .catch((e) => BaseController.requestErrorHandler(response, e));
    }
  }

  getOptionChain(request, response) {
    if (_.isEmpty(request.body)) {
      return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
    } else {
      QuoteService.getOptionChain(request.body.symbol)
        .then((data) => BaseController.requestGetSuccessHandler(response, data))
        .catch((e) => BaseController.requestErrorHandler(response, e));
    }
  }
}

export default new QuoteController();
