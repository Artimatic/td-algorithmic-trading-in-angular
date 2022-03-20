import { BacktestResults, Indicators } from '../backtest/backtest.service';
import DecisionService from '../mean-reversion/reversion-decision.service';
import * as _ from 'lodash';

export default class PredictionService {
  outputRange: number;
  outputLimit: number;

  constructor(range, limit) {
    this.outputRange = range;
    this.outputLimit = limit;
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

    const dataSetObj = this.buildInputSet(signals[0].close, currentSignal, featureUse);

    dataSetObj.output = [this.getOutput(closePrice, futureClose)];
    return dataSetObj;
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
      _.round(DecisionService.getPercentChange(openingPrice, close) * 1000, 0),
      _.round(currentSignal.macd[2][currentSignal.macd[2].length - 1] * 1000)
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

  getOutput(currentClose, futureClose) {
    if (DecisionService.getPercentChange(currentClose, futureClose) > this.outputLimit) {
      return 1;
    }

    return 0;
    // return _.round(futureClose, 2);
  }

  convertRecommendations(signal: Indicators) {
    let input = [];
    const targetRecommendation = 'bullish';
    if (signal && signal.recommendation) {
      input = this.recommendationToInput(signal, input, targetRecommendation);
    } else {
      console.log('Missing recommendation: ', signal);
    }

    return input;
  }

  convertRecommendationsForBearish(signal: Indicators) {
    let input = [];
    const targetRecommendation = 'bearish';
    if (signal && signal.recommendation) {
      input = this.recommendationToInput(signal, input, targetRecommendation);
    } else {
      console.log('Missing recommendation: ', signal);
    }

    return input;
  }

  recommendationToInput(signal: Indicators, input, targetRecommendation) {
    if (signal.recommendation.mfi && signal.recommendation.mfi.toLowerCase() === targetRecommendation) {
      input.push(1);
    } else {
      input.push(0);
    }

    if (signal.recommendation.mfiDivergence2 && signal.recommendation.mfiDivergence2.toLowerCase() === targetRecommendation) {
      input.push(1);
    } else {
      input.push(0);
    }


    if (signal.recommendation.bband && signal.recommendation.bband.toLowerCase() === targetRecommendation) {
      input.push(1);
    } else {
      input.push(0);
    }

    if (signal.recommendation.macd && signal.recommendation.macd.toLowerCase() === targetRecommendation) {
      input.push(1);
    } else {
      input.push(0);
    }

    if (signal.recommendation.demark9 && signal.recommendation.demark9.toLowerCase() === targetRecommendation) {
      input.push(1);
    } else {
      input.push(0);
    }

    if (signal.recommendation.vwma && signal.recommendation.vwma.toLowerCase() === targetRecommendation) {
      input.push(1);
    } else {
      input.push(0);
    }

    if (signal.recommendation.mfiTrade && signal.recommendation.mfiTrade.toLowerCase() === targetRecommendation) {
      input.push(1);
    } else {
      input.push(0);
    }

    if (signal.recommendation.mfiDivergence && signal.recommendation.mfiDivergence.toLowerCase() === targetRecommendation) {
      input.push(1);
    } else {
      input.push(0);
    }

    return input;
  }
  comparePrices(price, close) {
    if (close < price) {
      return 1;
    }
    return 0;
  }

  convertBBand(currentSignal) {
    if (currentSignal.bband80 && currentSignal.bband80.length === 3 &&
      currentSignal.bband80[0].length > 0 &&
      currentSignal.bband80[2].length > 0) {
      const lower = currentSignal.bband80[0][0];
      const currentClose = currentSignal.close;
      if (currentClose < lower) {
        return 1;
      }
      return 0;
    } else {
      throw new Error('BBand Missing');
    }
  }
}
