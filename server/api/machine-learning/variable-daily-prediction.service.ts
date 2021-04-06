import * as moment from 'moment';
import * as _ from 'lodash';

import BacktestService from '../backtest/backtest.service';
import { BacktestResults } from '../backtest/backtest.service';
import PredictionService from './prediction.service';
import TrainingService from './training.service';

class VariableDailyPredicationService extends PredictionService {
  modelName = 'model2021-04-01';

  constructor() {
    super(2, 0.003);
  }

  setOutputRange(range: number) {
    this.outputRange = range;
  }

  setOutputLimit(limit: number) {
    this.outputLimit = limit;
  }

  getModelName() {
    return 'daily_' + this.outputRange + '_' + this.outputLimit;
  }

  buildInputSet(openingPrice, currentSignal, featureUse) {
    if (!featureUse) {
      featureUse = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    }

    const dataSetObj = {
      date: null,
      input: null,
      output: null
    };

    const close = currentSignal.close;
    // const hour = Number(moment(currentSignal.date).format('HH'));

    dataSetObj.date = currentSignal.date;

    // 1,0,1,0,1,0,1,0,1,1,1,1,0: 6
    // 1,0,1,0,1,1,1,1,1,0,0,1,1: 5
    // 1,0,1,0,1,1,1,1,1,1,1,0,0: 5
    // 1,1,1,1,1,1,1,1,1,1,1,1,1
    const input = [
      // _.round(DecisionService.getPercentChange(openingPrice, close) * 1000, 0),
      // _.round(currentSignal.macd[2][currentSignal.macd[2].length - 1] * 1000)
      (openingPrice > close) ? 0 : 1,
      (currentSignal.mfiLeft > 75) ? 0 : 1
    ]
      .concat(this.comparePrices(currentSignal.vwma, close))
      .concat(this.comparePrices(currentSignal.high, close))
      .concat(this.comparePrices(currentSignal.low, close))
      .concat(this.convertRecommendations(currentSignal))
      .concat([this.convertBBand(currentSignal)])
      // .concat([
      //   _.round(currentSignal.high, 2),
      //   _.round(currentSignal.low, 2),
      //   _.round(currentSignal.vwma, 2),
      // ])
      // .concat([_.round(DecisionService.getPercentChange(close, currentSignal.vwma) * 1000, 2)])
      // .concat([_.round(DecisionService.getPercentChange(close, currentSignal.high) * 1000, 2)])
      // .concat([_.round(DecisionService.getPercentChange(close, currentSignal.low) * 1000, 2)])
      .concat([_.round(currentSignal.mfiLeft, 0)])
      .concat([_.round(currentSignal.rsi, 0)]);

    dataSetObj.input = [];

    featureUse.forEach((value, idx) => {
      if (value === '1' || value === 1) {
        dataSetObj.input.push(input[idx]);
      }
    });
    return dataSetObj;
  }

  train(symbol, startDate, endDate, trainingSize, featureUse) {
    return BacktestService.initDailyStrategy(symbol, moment(endDate).valueOf(), moment(startDate).valueOf(), { minQuotes: 80 })
      .then((results: BacktestResults) => {
        const finalDataSet = this.processBacktestResults(results, featureUse);
        return BacktestService.trainCustomModel(symbol, this.getModelName(), finalDataSet, trainingSize, moment().format('YYYY-MM-DD'));
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
        console.log('activate model: ', this.getModelName(featureUse));
        return BacktestService.activateCustomModel(symbol, this.getModelName(featureUse), inputData.input, moment().format('YYYY-MM-DD'));
      });
  }
}

export default new VariableDailyPredicationService();
