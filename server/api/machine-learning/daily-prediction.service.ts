import * as moment from 'moment';
import * as _ from 'lodash';

import BacktestService from '../backtest/backtest.service';
import { BacktestResults } from '../backtest/backtest.service';
import PredictionService from './prediction.service';
import TrainingService from './training.service';

class DailyPredicationService extends PredictionService {

  modelName = 'model2020-04-02';

  constructor() {
    super(1, 0.007);
  }

  getModelName(featureUse) {
    const modelName = featureUse ? featureUse.join() : this.modelName;
    return 'daily_' + modelName;
  }

  train(symbol, startDate, endDate, trainingSize, featureUse) {
    return BacktestService.initDailyStrategy(symbol, moment(endDate).valueOf(), moment(startDate).valueOf(), { minQuotes: 80 })
      .then((results: BacktestResults) => {
        const finalDataSet = this.processBacktestResults(results, featureUse);
        BacktestService.trainCustomModel(symbol, this.getModelName(featureUse), finalDataSet, trainingSize, moment().format('YYYY-MM-DD'));
        return finalDataSet;
      });
  }

  activate(symbol, featureUse) {
    let price = null;
    let openingPrice = null;
    let indicator = null;
    return TrainingService.buildDailyQuotes(symbol, moment().subtract({ days: 120 }).valueOf(), moment().valueOf())
      .then((quotes) => {
        console.log('len ; ', quotes.length);
        const subQuotes = quotes.slice(quotes.length - 80, quotes.length);
        price = quotes[quotes.length - 1].close;
        openingPrice = quotes[0].close;
        return BacktestService.initStrategy(subQuotes);
      })
      .then((indicators) => {
        indicator = indicators;

        return BacktestService.getDaytradeRecommendation(price, indicator);
      })
      .then((recommendation) => {
        indicator.recommendation = recommendation;
        return indicator;
      })
      .then((signal) => {
        const inputData = this.buildInputSet(openingPrice, signal, featureUse);

        return BacktestService.activateCustomModel(symbol, this.getModelName(featureUse), inputData.input, moment().format('YYYY-MM-DD'));
      });
  }
}

export default new DailyPredicationService();
