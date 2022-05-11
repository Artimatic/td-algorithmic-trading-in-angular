import * as moment from 'moment';
import * as _ from 'lodash';

import QuoteService from '../quote/quote.service';
import BacktestService from '../backtest/backtest.service';
import { BacktestResults } from '../backtest/backtest.service';
import PortfolioService from '../portfolio/portfolio.service';
import PredictionService from './prediction.service';

class IntradayPredicationService extends PredictionService {

  modelName = 'model2020-04-02';

  constructor() {
    super(15, 0.001);
  }

  train(symbol, startDate, endDate, trainingSize, featureUse) {
    return this.getQuotes(symbol, moment(startDate).valueOf(), moment(endDate).valueOf())
      .then((data) => {
        console.log('Got quotes ', data[0].date, data[data.length - 1].date);
        return QuoteService.postIntradayData(data);
      })
      .catch((error) => {
        console.error('Error posting intraday data: ', error.message);
      })
      .then(() => {
        console.log('Get backtest ', symbol, startDate, endDate);

        return BacktestService.runDaytradeBacktest(symbol, endDate, startDate,
          {
            lossThreshold: 0.003,
            profitThreshold: 0.02,
            minQuotes: 81
          });
      })
      .then((results: BacktestResults) => {
        const finalDataSet = this.processBacktestResults(results, featureUse);
        const modelName = featureUse ? featureUse.join() : this.modelName;

        // return BacktestService.trainTensorModel(symbol, modelName, finalDataSet, trainingSize, moment().format('YYYY-MM-DD'));
        return BacktestService.trainCustomModel(symbol, modelName, finalDataSet, trainingSize, moment().format('YYYY-MM-DD'));
      });
  }

  activate(symbol, featureUse) {
    return this.getQuotes(symbol, moment().subtract({ days: 1 }).valueOf(), moment().valueOf())
      .then((quotes) => {
        return this.getIndicators(quotes);
      })
      .then((signalData) => {
        return this.activateModel(symbol, signalData, featureUse);
      });
  }


  getQuotes(symbol, start, end) {
    return PortfolioService.getIntradayV3(symbol, start, end);
  }

  getIndicators(quotes) {
    let price = null;
    let indicator = null;
    const subQuotes = quotes.slice(quotes.length - 80, quotes.length);
    price = quotes[quotes.length - 1].close;
    return BacktestService.initStrategy(subQuotes)
      .then((indicators) => {
        indicator = indicators;
        return BacktestService.getDaytradeRecommendation(price, indicator);
      })
      .then((recommendation) => {
        indicator.recommendation = recommendation;
        return indicator;
      });
  }

  activateModel(symbol, indicatorData, featureUse) {
    if (!featureUse) {
      featureUse = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    }
    const signal = indicatorData;
    const inputData = this.buildInputSet(signal, featureUse);
    const modelName = featureUse ? featureUse.join() : this.modelName;
    return BacktestService.activateCustomModel(symbol, modelName, inputData.input, moment().format('YYYY-MM-DD'));
  }

  processBacktestResults(results: BacktestResults, featureUse): any[] {
    const signals = results.signals;
    console.log('Got backtest: ', signals[0].date, signals[signals.length - 1].date);

    const finalDataSet = [];
    signals.forEach((signal, idx) => {
      if (this.withinBounds(idx, signals.length)) {
        finalDataSet.push(this.buildFeatureSet(signals, signal, idx, featureUse));
      }
    });
    console.log('Data set size: ', finalDataSet.length);
    return finalDataSet;
  }

  withinBounds(index, totalLength) {
    return index > this.outputRange && (index + this.outputRange + 1 < totalLength);
  }

  buildFeatureSet(signals, currentSignal, currentIndex, featureUse) {
    const futureClose = signals[currentIndex + this.outputRange].close;
    const closePrice = currentSignal.close;

    const dataSetObj = this.buildInputSet(currentSignal, featureUse);

    dataSetObj.output = [this.getOutput(closePrice, futureClose)];
    return dataSetObj;
  }

  buildInputSet(currentSignal, featureUse) {
    if (!featureUse) {
      featureUse = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    }

    const dataSetObj = {
      date: null,
      input: null,
      output: null
    };

    const close = currentSignal.close;
    dataSetObj.date = currentSignal.date;

    const input = []
      .concat(this.comparePrices(currentSignal.vwma, close))
      .concat(this.convertRecommendations(currentSignal));

    dataSetObj.input = [];

    featureUse.forEach((value, idx) => {
      if ((value === '1' || value === 1) && input[idx] !== undefined) {
        dataSetObj.input.push(input[idx]);
      }
    });
    return dataSetObj;
  }
}

export default new IntradayPredicationService();
