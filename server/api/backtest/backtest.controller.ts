import * as _ from 'lodash';
import * as Boom from 'boom';

import BaseController from '../templates/base.controller';

import BacktestService from './backtest.service';

class BacktestController extends BaseController {

  constructor() {
    super();
  }

  backtest(request, response) {
    if (_.isEmpty(request.body)) {
      return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
    } else {
      if (request.body.algo) {
        switch (request.body.algo) {
          case 'evaluate-intraday':
            BacktestService.evaluateIntradayAlgo(request.body.ticker, request.body.end, request.body.start)
              .then((data) => BaseController.requestGetSuccessHandler(response, data))
              .catch((err) => BaseController.requestErrorHandler(response, err));
            break;
          case 'v1':
            BacktestService.evaluateStrategyAll(request.body.ticker, request.body.end, request.body.start)
              .then((data) => BaseController.requestGetSuccessHandler(response, data))
              .catch((err) => BaseController.requestErrorHandler(response, err));
            break;
          default:
          return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
        }
      } else {
        BacktestService.intradayTest(request.body.ticker, request.body.end, request.body.start)
        .then((data) => BaseController.requestGetSuccessHandler(response, data))
        .catch((err) => BaseController.requestErrorHandler(response, err));
      }
    }
  }

  getMeanReversionChart(request, response) {
    if (_.isEmpty(request.body) ||
      !request.body.short ||
      !request.body.long) {
      return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
    } else {
      BacktestService.getMeanReversionChart(request.body.ticker,
        request.body.end,
        request.body.start,
        parseFloat(request.body.deviation),
        request.body.short,
        request.body.long)
        .then((data) => {
          if (data.length > 500) {
            return data.slice(data.length - 500, data.length);
          }
          return data;
        })
        .then((data) => BaseController.requestGetSuccessHandler(response, data))
        .catch((err) => BaseController.requestErrorHandler(response, err));
    }
  }

  getIndicator(request, response) {
    BaseController.requestGetSuccessHandler(response, BacktestService.getIndicator());
  }

  getBollingerBands(request, response) {
    if (_.isEmpty(request.body)) {
      return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
    } else {
      BacktestService.getBBands(request.body.real, request.body.period, request.body.stddev)
        .then((data) => BaseController.requestGetSuccessHandler(response, data))
        .catch((err) => BaseController.requestErrorHandler(response, err));
    }
  }

  getSMA(request, response) {
    if (_.isEmpty(request.body)) {
      return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
    } else {
      BacktestService.getSMA(request.body.real, request.body.period)
        .then((data) => BaseController.requestGetSuccessHandler(response, data))
        .catch((err) => BaseController.requestErrorHandler(response, err));
    }
  }

  getMfi(request, response) {
    if (_.isEmpty(request.body)) {
      return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
    } else {
      BacktestService.getMfi(request.body.high, request.body.low, request.body.close, request.body.volume, request.body.period)
        .then((data) => BaseController.requestGetSuccessHandler(response, data))
        .catch((err) => BaseController.requestErrorHandler(response, err));
    }
  }

  getRateOfChange(request, response) {
    if (_.isEmpty(request.body)) {
      return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
    } else {
      BacktestService.getRateOfChange(request.body.real, request.body.period)
        .then((data) => BaseController.requestGetSuccessHandler(response, data))
        .catch((err) => BaseController.requestErrorHandler(response, err));
    }
  }

  getInfoV2(request, response) {
    BacktestService.getInfoV2(request.body.symbol, request.body.to, request.body.from)
      .then((data) => BaseController.requestGetSuccessHandler(response, data))
      .catch((err) => BaseController.requestErrorHandler(response, err));
  }

  getInfoV2Chart(request, response) {
    BacktestService.getInfoV2Chart(request.body.symbol, request.body.to, request.body.from)
      .then((data) => BaseController.requestGetSuccessHandler(response, data))
      .catch((err) => BaseController.requestErrorHandler(response, err));
  }

  getHistoricalMatches(request, response) {
    BacktestService.getHistoricalMatches(request.body.symbol, request.body.to, request.body.from)
    .then((data) => BaseController.requestGetSuccessHandler(response, data))
    .catch((err) => BaseController.requestErrorHandler(response, err));
  }
}

export default new BacktestController();
