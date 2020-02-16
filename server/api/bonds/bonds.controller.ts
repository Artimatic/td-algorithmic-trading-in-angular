import * as _ from 'lodash';

import BaseController from '../templates/base.controller';

import BondsService from './bonds.service';

class BondsController extends BaseController {
  constructor() {
    super();
  }

  getSpreadData(request, response) {
    BondsService.get10y2ySpread()
      .then((data) => BaseController.requestGetSuccessHandler(response, data))
      .catch((err) => BaseController.requestErrorHandler(response, err));
    }
}

export default new BondsController();
