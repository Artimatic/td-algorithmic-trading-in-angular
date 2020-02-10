import * as _ from 'lodash';

import BaseController from '../templates/base.controller';
import TrainingService from './training.service';

class MachineLearningController extends BaseController {

  constructor() {
    super();
  }

  getTrainingDataSetV2(request, response) {
    TrainingService.train(request.query.symbol, request.query.startDate, request.query.endDate)
      .then((data) => BaseController.requestGetSuccessHandler(response, data))
      .catch((err) => BaseController.requestErrorHandler(response, err));
  }

  getIntradayTrainingData(request, response) {
    TrainingService.getTrainingDataFromIntraday(request.query.symbol, request.query.accountId)
      .then((data) => BaseController.requestGetSuccessHandler(response, data))
      .catch((err) => BaseController.requestErrorHandler(response, err));
  }

  testV2Model(request, response) {
    TrainingService.testModel(request.query.symbol, request.query.startDate, request.query.endDate)
      .then((data) => BaseController.requestGetSuccessHandler(response, data))
      .catch((err) => BaseController.requestErrorHandler(response, err));
  }

  activateV2Model(request, response) {
    TrainingService.activateModel(request.query.symbol, request.query.startDate)
    response.status(200).send({});
  }
}

export default new MachineLearningController();
