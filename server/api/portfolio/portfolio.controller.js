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
    PortfolioService.login(response);
  }

  mfaLogin(request, response) {
    if (_.isEmpty(request.body)) {
      return response.status(Boom.badRequest().output.statusCode).send(Boom.badRequest().output);
    }
    else {
      PortfolioService.mfaLogin(request.body.code, response);
    }
  }

  getPortfolio(request, response) {
    PortfolioService.getPortfolio(response);
  }

  getPositions(request, response) {
    PortfolioService.getPositions(response);
  }
  
}

module.exports.PortfolioController = new PortfolioController();
