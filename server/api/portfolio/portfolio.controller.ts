import * as _ from 'lodash';
import * as Boom from 'boom';

import BaseController from '../templates/base.controller';

import PortfolioService from './portfolio.service';

class PortfolioController extends BaseController {

  constructor() {
    super();
  }

  login(request, response) {
    if (_.isEmpty(request.body)) {
      return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
    } else {
      PortfolioService.login(request.body.username, request.body.password, response);
    }
  }

  mfaLogin(request, response) {
    if (_.isEmpty(request.body)) {
      return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
    } else {
      PortfolioService.mfaLogin(request.body.username, request.body.password, request.body.code, response);
    }
  }

  logout(request, response) {
    if (_.isEmpty(request.body)) {
      return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
    } else {
      PortfolioService.expireToken(request.body.token, response);
    }
  }

  getPortfolio(request, response) {
    if (_.isEmpty(request.headers.authorization)) {
      return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
    } else {
      PortfolioService.getPortfolio(request.headers.authorization.replace('Bearer ', ''), response);
    }
  }

  getPositions(request, response) {
    if (_.isEmpty(request.headers.authorization)) {
      return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
    } else {
      PortfolioService.getPositions(request.headers.authorization.replace('Bearer ', ''), response);
    }
  }

  getResources(request, response) {
    const urlRegex =
      /^https\:\/\/api\.robinhood\.com\/instruments\/[a-z0-9]{8}\-[a-z0-9]{4}\-[a-z0-9]{4}\-[a-z0-9]{4}\-[a-z0-9]{12}\/{0,}$/;
    if (_.isEmpty(request.body) || _.isEmpty(request.body.instrument) || !request.body.instrument.match(urlRegex)) {
      return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
    } else {
      PortfolioService.getResource(request.body.instrument, response);
    }
  }

  sell(request, response) {
    if (_.isEmpty(request.headers.authorization) || _.isEmpty(request.body)) {
      return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
    } else {
      PortfolioService.sell(request.body.account,
        request.headers.authorization.replace('Bearer ', ''),
        request.body.url,
        request.body.symbol,
        request.body.quantity,
        request.body.price,
        request.body.type,
        request.body.extendedHour)
        .then((data) => BaseController.requestGetSuccessHandler(response, data))
        .catch((err) => BaseController.requestErrorHandler(response, err));
    }
  }

  buy(request, response) {
    if (_.isEmpty(request.headers.authorization) || _.isEmpty(request.body)) {
      return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
    } else {
      PortfolioService.buy(request.body.account,
        request.headers.authorization.replace('Bearer ', ''),
        request.body.url,
        request.body.symbol,
        request.body.quantity,
        request.body.price,
        request.body.type,
        request.body.extendedHour)
        .then((data) => BaseController.requestGetSuccessHandler(response, data))
        .catch((err) => BaseController.requestErrorHandler(response, err));
    }
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

  midPrice(ask, bid) {
    return _.round(_.multiply(_.add(_.divide(_.subtract(_.divide(ask, bid), 1), 2), 1), bid), 2);
  }

  getQuote(request, response) {
    PortfolioService.getQuote(request.query.symbol, request.query.accountId)
      .then((priceData) => {
        response.status(200).send({
          price: 1 * this.midPrice(priceData[request.query.symbol].askPrice, priceData[request.query.symbol].bidPrice),
          bidPrice: 1 * priceData[request.query.symbol].bidPrice,
          askPrice: 1 * priceData[request.query.symbol].askPrice
        });
      })
      .catch((err) => BaseController.requestErrorHandler(response, err));
  }

  getIntraday(request, response) {
    PortfolioService.getIntraday(request.query.symbol, request.query.accountId)
      .then((data) => BaseController.requestGetSuccessHandler(response, data))
      .catch((err) => BaseController.requestErrorHandler(response, err));
  }
  
  getIntradayV2(request, response) {
    PortfolioService.getIntradayV2(request.query.symbol, 1)
      .then((data) => BaseController.requestGetSuccessHandler(response, data))
      .catch((err) => BaseController.requestErrorHandler(response, err));
  }

  getDailyQuotes(request, response) {
    PortfolioService.getDailyQuotes(request.query.symbol, request.query.startDate, request.query.endDate, request.query.accountId)
      .then((data) => BaseController.requestGetSuccessHandler(response, data))
      .catch((err) => BaseController.requestErrorHandler(response, err));
  }

  tdBuy(request, response) {
    PortfolioService.sendTdBuyOrder(request.body.symbol,
      request.body.quantity,
      request.body.price,
      request.body.type,
      request.body.extendedHours,
      request.body.accountId)
      .then((data) => BaseController.requestGetSuccessHandler(response, data))
      .catch((err) => BaseController.requestErrorHandler(response, err));
  }

  tdSell(request, response) {
    PortfolioService.sendTdSellOrder(request.body.symbol,
      request.body.quantity,
      request.body.price,
      request.body.type,
      request.body.extendedHours,
      request.body.accountId)
      .then((data) => BaseController.requestGetSuccessHandler(response, data))
      .catch((err) => BaseController.requestErrorHandler(response, err));
  }

  tdPosition(request, response) {
    PortfolioService.getTdPositions(request.query.accountId)
      .then((data) => BaseController.requestGetSuccessHandler(response, data))
      .catch((err) => BaseController.requestErrorHandler(response, err));
  }

  tdBalance(request, response) {
    PortfolioService.getTdBalance(request.query.accountId)
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
