import * as _ from 'lodash';
import * as Boom from 'boom';

import BaseController from '../templates/base.controller';

import BacktestService from './backtest.service';
import MfiService from './mfi.service';
import BacktestAggregationService from './backtest-aggregation.service';

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
          case 'intraday':
            BacktestService.evaluateIntradayAlgo(request.body.ticker, request.body.end, request.body.start)
              .then((data) => BaseController.requestGetSuccessHandler(response, data))
              .catch((err) => BaseController.requestErrorHandler(response, err));
            break;
          case 'v1':
            BacktestService.evaluateStrategyAll(request.body.ticker, request.body.end, request.body.start);
            response.status(200).send({});
            break;
          case 'daily-bband':
            BacktestService.evaluateBband(request.body.ticker, request.body.end, request.body.start)
              .then((data) => BaseController.requestGetSuccessHandler(response, data))
              .catch((err) => BaseController.requestErrorHandler(response, err));
            break;
          case 'daily-mfi':
            BacktestService.evaluateDailyMfi(request.body.ticker, request.body.end, request.body.start)
              .then((data) => BaseController.requestGetSuccessHandler(response, data))
              .catch((err) => BaseController.requestErrorHandler(response, err));
            break;
          case 'daily-roc':
            BacktestService.evaluateDailyRocMfiTrend(request.body.ticker, request.body.end, request.body.start)
              .then((data) => BaseController.requestGetSuccessHandler(response, data))
              .catch((err) => BaseController.requestErrorHandler(response, err));
            break;
          case 'daily-indicators':
            BacktestService.initDailyStrategy(request.body.ticker, request.body.end, request.body.start, request.body.parameters)
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
      console.log('Received: ', request.body);

      BacktestService.getSMA(request.body.real, request.body.period)
        .then((data) => BaseController.requestGetSuccessHandler(response, data))
        .catch((err) => BaseController.requestErrorHandler(response, err));
    }
  }

  getMfi(request, response) {
    if (_.isEmpty(request.body)) {
      return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
    } else {
      MfiService.getMfi(request.body.high, request.body.low, request.body.close, request.body.volume, request.body.period)
        .then((data) => BaseController.requestGetSuccessHandler(response, data))
        .catch((err) => BaseController.requestErrorHandler(response, err));
    }
  }

  getMacd(request, response) {
    if (_.isEmpty(request.body)) {
      return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
    } else {
      BacktestService.getMacd(request.body.real, request.body.shortPeriod, request.body.longPeriod, request.body.signalPeriod)
        .then((data) => BaseController.requestGetSuccessHandler(response, data))
        .catch((err) => BaseController.requestErrorHandler(response, err));
    }
  }

  getRsi(request, response) {
    if (_.isEmpty(request.body)) {
      return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
    } else {
      BacktestService.getRsi(request.body.real, request.body.period)
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

  getVwma(request, response) {
    if (_.isEmpty(request.body)) {
      return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
    } else {
      BacktestService.getVwma(request.body.close, request.body.volume, request.body.period)
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

  getDataStatus(request, response) {
    BacktestService.checkServiceStatus('data')
      .then((data) => BaseController.requestGetSuccessHandler(response, data))
      .catch((err) => BaseController.requestErrorHandler(response, err));
  }

  getAnalysisStatus(request, response) {
    BacktestService.checkServiceStatus('ml')
      .then((data) => BaseController.requestGetSuccessHandler(response, data))
      .catch((err) => BaseController.requestErrorHandler(response, err));
  }

  runRNN(request, response) {
    if (_.isEmpty(request.body) || !request.body.symbol || !request.body.to || !request.body.from) {
      return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
    } else {
      BacktestService.runRNN(request.body.symbol, request.body.to, request.body.from, response);
    }
  }

  getRNNPrediction(request, response) {
    BacktestService.checkRNNStatus(request.body.symbol, request.body.to, request.body.modelName)
      .then((data) => { response.json(data); })
      .catch((err) => BaseController.requestErrorHandler(response, err));
  }

  activateRNN(request, response) {
    BacktestService.activateRNN(request.body.symbol, request.body.to, response);
  }

  bbandMfi(request, response) {
    BacktestService.bbandMfiInfo(request.body.symbol, request.body.to, request.body.from)
      .then((data) => BaseController.requestGetSuccessHandler(response, data))
      .catch((err) => BaseController.requestErrorHandler(response, err));
  }

  getMaCrossOver(request, response) {
    BacktestService.getMovingAverageCrossOverInfo(request.body.symbol, request.body.to, request.body.from, request.body.settings)
      .then((data) => BaseController.requestGetSuccessHandler(response, data))
      .catch((err) => BaseController.requestErrorHandler(response, err));
  }

  findResistance(request, response) {
    BacktestService.findResistance(request.body.symbol, request.body.to, request.body.from)
      .then((data) => BaseController.requestGetSuccessHandler(response, data))
      .catch((err) => BaseController.requestErrorHandler(response, err));
  }

  getDaytradeIndicators(request, response) {
    BacktestService.getCurrentDaytradeIndicators(request.body.symbol, request.body.period)
      .then((data) => BaseController.requestGetSuccessHandler(response, data))
      .catch((err) => BaseController.requestErrorHandler(response, err));
  }

  getDaytradeBacktest(request, response) {
    if (_.isEmpty(request.body) ||
      !request.body.symbol ||
      !request.body.currentDate ||
      !request.body.startDate ||
      !request.body.parameters) {
      return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
    }
    BacktestService.runDaytradeBacktest(request.body.symbol,
      request.body.currentDate,
      request.body.startDate,
      request.body.parameters)
      .then((data) => BaseController.requestGetSuccessHandler(response, data))
      .catch((err) => BaseController.requestErrorHandler(response, err));
  }

  getCurrentDaytrade(request, response) {
    if (_.isEmpty(request.body) ||
      !request.body.symbol) {
      return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
    }
    BacktestService.getCurrentDaytrade(
      request.body.symbol,
      request.body.price,
      request.body.paidPrice,
      request.body.parameters, response);

  }

  calibrateDaytrade(request, response) {
    if (_.isEmpty(request.body) ||
      !request.body.symbols ||
      !request.body.currentDate ||
      !request.body.startDate) {
      return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
    }
    BacktestService.calibrateDaytrade(request.body.symbols,
      request.body.currentDate,
      request.body.startDate,
      response);
  }

  scoreSignals(request, response) {
    const data = BacktestAggregationService.getSignalResults(request.body.signals);
    BaseController.requestGetSuccessHandler(response, data);
  }

  getProbabilityOfProfit(request, response) {
    const data = BacktestAggregationService.getProbabilityOfProfit(request.body.bullishActiveIndicators, request.body.bearishActiveIndicators, request.body.signals);
    BaseController.requestGetSuccessHandler(response, data);
  }
}

export default new BacktestController();
