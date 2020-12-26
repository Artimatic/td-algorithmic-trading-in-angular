import * as _ from 'lodash';

import BaseController from '../templates/base.controller';
import TrainingService from './training.service';
import IntradayPredicationService from './intraday-prediction.service';
import DailyPredicationService from './daily-prediction.service';

class MachineLearningController extends BaseController {

  constructor() {
    super();
  }

  getTrainingDataSetV2(request, response) {
    TrainingService.train(request.query.symbol, request.query.startDate, request.query.endDate)
      .then((data) => BaseController.requestGetSuccessHandler(response, data))
      .catch((err) => {
        console.log('Error getTrainingDataSetV2: ', err);
        return BaseController.requestErrorHandler(response, err);
      });
  }

  activateWithIntradayData(request, response) {
    TrainingService.trainWithIntraday(request.query.symbol)
      .then((data) => BaseController.requestGetSuccessHandler(response, data))
      .catch((err) => BaseController.requestErrorHandler(response, err));
  }

  testV2Model(request, response) {
    TrainingService.testModel(request.query.symbol, request.query.startDate, request.query.endDate, request.query.trainingSize)
      .then((data) => BaseController.requestGetSuccessHandler(response, data))
      .catch((err) => BaseController.requestErrorHandler(response, err));
  }

  async activateV2Model(request, response) {
    const result = await TrainingService.activateModel(request.query.symbol, request.query.startDate);
    response.status(200).send(result);
  }

  trainV3(request, response) {
    const features = request.query.features ? request.query.features.split(',') : null;

    IntradayPredicationService.train(request.query.symbol,
      request.query.startDate,
      request.query.endDate,
      request.query.trainingSize,
      features)
      .then((data) => BaseController.requestGetSuccessHandler(response, data))
      .catch((err) => BaseController.requestErrorHandler(response, err));
  }

  trainDailyV3(request, response) {
    const features = request.query.features ? request.query.features.split(',') : null;

    DailyPredicationService.train(request.query.symbol,
      request.query.startDate,
      request.query.endDate,
      request.query.trainingSize,
      features)
      .then((data) => BaseController.requestGetSuccessHandler(response, data));
  }

  activateV3(request, response) {
    const features = request.query.features ? request.query.features.split(',') : null;

    IntradayPredicationService.activate(request.query.symbol, features)
      .then((data) => BaseController.requestGetSuccessHandler(response, data))
      .catch((err) => BaseController.requestErrorHandler(response, err));
  }

  activateDailyV3(request, response) {
    const features = request.query.features ? request.query.features.split(',') : null;

    DailyPredicationService.activate(request.query.symbol, features)
      .then((data) => BaseController.requestGetSuccessHandler(response, data));
  }
}

export default new MachineLearningController();
