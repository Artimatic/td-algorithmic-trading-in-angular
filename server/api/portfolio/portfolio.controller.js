import * as _ from 'lodash';
import * as Boom from 'boom';

import BaseController from '../../api/templates/base.controller';

import { PortfolioService } from './portfolio.service';

import * as errors from '../../components/errors/baseErrors';

class PortfolioController extends BaseController {

  constructor() {
    super();
  }

  login(request, response) {
    if (_.isEmpty(request.body)) {
      return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
    }
    else {
      PortfolioService.login(request.body.username, request.body.password, response);
    }
  }

  mfaLogin(request, response) {
    if (_.isEmpty(request.body)) {
      return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
    }
    else {
      PortfolioService.mfaLogin(request.body.username, request.body.password, request.body.code, response);
    }
  }

  logout(request, response) {
    if (_.isEmpty(request.body)) {
      return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
    }
    else {
      PortfolioService.expireToken(request.body.token, response);
    }
  }

  getPortfolio(request, response) {
    if (_.isEmpty(request.headers.authorization)) {
      return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
    }
    else {
      PortfolioService.getPortfolio(request.headers.authorization.replace('Bearer ', ''), response);
    }
  }

  getPositions(request, response) {
    if (_.isEmpty(request.headers.authorization)) {
      return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
    }
    else {
      PortfolioService.getPositions(request.headers.authorization.replace('Bearer ', ''), response);
    }
  }

}

module.exports.PortfolioController = new PortfolioController();
