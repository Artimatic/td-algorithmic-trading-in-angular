import * as _ from 'lodash';
import * as Boom from 'boom';

import BaseController from '../templates/base.controller';

import PortfolioService from './portfolio.service';

class PortfolioController extends BaseController {

  constructor() {
    super();
  }

  login(request, response) {
    PortfolioService.login(request.query.consumerKey, request.query.callbackUrl, response);
  }

  getAccessToken(request, response) {
    PortfolioService.getAccessToken(
      request.body.accountId, 
      request.body.appKey, 
      request.body.secret, 
      request.body.code, 
      request.body.callbackUrl, 
      response);
  }

  getInstruments(request, response) {
    if (_.isEmpty(request.body)) {
      return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
    } else {
      response.status(200).send({
        results: [{
          instrument: '',
          symbol: request.body.symbol,
          name: null
        }]
      });
    }
  }

  getInstrument(request, response) {
    console.log('query',request.query);
    PortfolioService.getInstrument(request.query.cusip)
      .then((data) => BaseController.requestGetSuccessHandler(response, data))
      .catch((err) => BaseController.requestErrorHandler(response, err));
  }

  midPrice(ask, bid) {
    return _.round(_.multiply(_.add(_.divide(_.subtract(_.divide(ask, bid), 1), 2), 1), bid), 2);
  }

  getQuote(request, response) {
    PortfolioService.getQuote(request.query.symbol, request.query.accountId, response)
      .then((priceData) => {
        response.status(200).send(priceData);
      })
      .catch((err) => BaseController.requestErrorHandler(response, err));
  }

  getIntraday(request, response) {
    PortfolioService.getIntraday(request.query.symbol, request.query.accountId, response)
      .then((data) => BaseController.requestGetSuccessHandler(response, data))
      .catch((err) => BaseController.requestErrorHandler(response, err));
  }

  getIntradayV2(request, response) {
    PortfolioService.getIntradayV2(request.query.symbol, 1, null, null, response)
      .then((data) => BaseController.requestGetSuccessHandler(response, data))
      .catch((err) => BaseController.requestErrorHandler(response, err));
  }

  getDailyQuotes(request, response) {
    PortfolioService.getDailyQuotes(request.query.symbol, request.query.startDate, request.query.endDate, request.query.accountId, response)
      .then((data) => BaseController.requestGetSuccessHandler(response, data))
      .catch((err) => BaseController.requestErrorHandler(response, err));
  }

  tdBuy(request, response) {
    PortfolioService.sendTdBuyOrder(request.body.symbol,
      request.body.quantity,
      request.body.price,
      request.body.type,
      request.body.extendedHours,
      request.body.accountId,
      response)
      .then((data) => BaseController.requestGetSuccessHandler(response, data))
      .catch((err) => BaseController.requestErrorHandler(response, err));
  }

  tdSell(request, response) {
    PortfolioService.sendTdSellOrder(request.body.symbol,
      request.body.quantity,
      request.body.price,
      request.body.type,
      request.body.extendedHours,
      request.body.accountId,
      response)
      .then((data) => BaseController.requestGetSuccessHandler(response, data))
      .catch((err) => BaseController.requestErrorHandler(response, err));
  }

  twoLegOrder(request, response) {
    PortfolioService.sendTwoLegOrder(request.body.primaryLegSymbol,
      request.body.secondaryLegSymbol,
      request.body.quantity,
      request.body.price,
      request.body.type,
      request.body.extendedHours,
      request.body.accountId,
      response)
      .then((data) => BaseController.requestGetSuccessHandler(response, data))
      .catch((err) => BaseController.requestErrorHandler(response, err));
  }

  tdPosition(request, response) {
    PortfolioService.getPositions(request.query.accountId)
      .then((data) => BaseController.requestGetSuccessHandler(response, data))
      .catch((err) => BaseController.requestErrorHandler(response, err));
  }

  tdBalance(request, response) {
    PortfolioService.getTdBalance(request.query.accountId, response)
      .then((data) => BaseController.requestGetSuccessHandler(response, data))
      .catch((err) => BaseController.requestErrorHandler(response, err));
  }

  getEquityMarketHours(request, response) {
    PortfolioService.getEquityMarketHours(request.query.date)
      .then((data) => BaseController.requestGetSuccessHandler(response, data))
      .catch((err) => BaseController.requestErrorHandler(response, err));
  }
  
  setCredentials(request, response) {
    PortfolioService.setCredentials(request.body.accountId,
      request.body.key,
      request.body.refreshToken,
      response);
  }

  checkForCredentials(request, response) {
    PortfolioService.isSet(request.body.accountId, response);
  }

  deleteCredentials(request, response) {
    PortfolioService.deleteCredentials(request.body.accountId, response);
  }
}

export default new PortfolioController();
