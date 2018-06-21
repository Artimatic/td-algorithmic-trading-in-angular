import * as _ from 'lodash';
import * as Boom from 'boom';

import BaseController from '../../api/templates/base.controller';

import { BacktestService } from './backtest.service';

import * as errors from '../../components/errors/baseErrors';

class BacktestController extends BaseController {

  constructor() {
    super();
  }

  backtest(request, response) {
    if (_.isEmpty(request.body)) {
      return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
    }
    else {
      BacktestService.evaluateStrategyAll(request.body.ticker, request.body.end, request.body.start)
        .then((data) => BaseController.requestGetSuccessHandler(response, data))
        .catch((err) => BaseController.requestErrorHandler(response, err));
    }
  }

  getMeanReversionChart(request, response) {
    if (_.isEmpty(request.body) ||
      !request.body.short ||
      !request.body.long) {
      return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
    }
    else {
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
    BaseController.requestGetSuccessHandler(response, BacktestService.getIndicator())
  }

  getBollingerBands(request, response) {
    if (_.isEmpty(request.body)) {
      return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
    }
    else {
      BacktestService.getBBands(request.body.real, request.body.period, request.body.stddev)
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
}

module.exports.BacktestController = new BacktestController();
