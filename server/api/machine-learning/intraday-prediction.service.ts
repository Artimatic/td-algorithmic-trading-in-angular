import QuoteService from '../quote/quote.service';
import BacktestService from '../backtest/backtest.service';
import { BacktestResults, Indicators } from '../backtest/backtest.service';
import TrainingService from './training.service';

class IntradayPredicationService {
  train(symbol, startDate, endDate) {
    return QuoteService.getData(symbol, '1m', '1d')
      .then((data) => {
        console.log('Got quotes');
        return QuoteService.postIntradayData(data);
      })
      .catch((error) => {
        console.error('Error: ', error.message);
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
        console.log('Got backtest');

        const signals = results.signals;
        const finalDataSet = [];
        signals.forEach((signal, idx) => {
          if (this.withinBounds(idx, signals.length)) {
            finalDataSet.push(this.buildFeatureSet(signals, signal, idx));
          }
        });

        console.log('Final Data Set: ', finalDataSet);
        return finalDataSet;
        // return BacktestService.trainCustomModel(symbol, 'New Model', finalDataSet);
      });
  }

  withinBounds(index, totalLength) {
    return index > 0 && (index + 30 < totalLength);
  }

  compareVwma(vwma, close) {
    if (close < vwma) {
      return -1;
    } else if (close > vwma) {
      return 1;
    }

    return 0;
  }

  convertBBand(currentSignal) {
    if (currentSignal.bband80 && currentSignal.bband80.length === 3 &&
      currentSignal.bband80[0].length > 0 &&
      currentSignal.bband80[2].length > 0) {
      const lower = currentSignal.bband80[0][0];
      const upper = currentSignal.bband80[2][0];
      const currentClose = currentSignal.close;
      if (currentClose < lower) {
        return -1;
      } else if (currentClose > upper) {
        return 1;
      }
      return 0;
    } else {
      throw new Error('BBand Missing');
    }
  }

  getOutput(currentClose, futureClose) {
    if (currentClose > futureClose) {
      return 1;
    } else if (currentClose < futureClose) {
      return -1;
    }
    return 0;
  }

  convertRecommendations(signal: Indicators) {
    const input = [];
    console.log('recommendations: ', signal.recommendation);
    if (signal.recommendation.recommendation && signal.recommendation.recommendation.toLowerCase() === 'buy') {
      input.push(1);
    } else if (signal.recommendation.recommendation && signal.recommendation.recommendation.toLowerCase() === 'sell') {
      input.push(-1);
    } else {
      input.push(0);
    }

    if (signal.recommendation.mfi && signal.recommendation.mfi.toLowerCase() === 'bullish') {
      input.push(1);
    } else if (signal.recommendation.mfi && signal.recommendation.mfi.toLowerCase() === 'bearish') {
      input.push(-1);
    } else {
      input.push(0);
    }

    if (signal.recommendation.roc && signal.recommendation.roc.toLowerCase() === 'bullish') {
      input.push(1);
    } else if (signal.recommendation.roc && signal.recommendation.roc.toLowerCase() === 'bearish') {
      input.push(-1);
    } else {
      input.push(0);
    }

    if (signal.recommendation.bband && signal.recommendation.bband.toLowerCase() === 'bullish') {
      input.push(1);
    } else if (signal.recommendation.bband && signal.recommendation.bband.toLowerCase() === 'bearish') {
      input.push(-1);
    } else {
      input.push(0);
    }

    if (signal.recommendation.vwma && signal.recommendation.vwma.toLowerCase() === 'bullish') {
      input.push(1);
    } else if (signal.recommendation.vwma && signal.recommendation.vwma.toLowerCase() === 'bearish') {
      input.push(-1);
    } else {
      input.push(0);
    }

    return input;
  }

  buildFeatureSet(signals, currentSignal, currentIndex) {
    const dataSetObj = {
      date: null,
      input: null,
      output: null
    };
    const day = new Date(currentSignal.date).getUTCDay();

    dataSetObj.date = currentSignal.date;
    dataSetObj.input = [day]
      .concat(TrainingService.compareQuotes(signals[currentIndex - 1], currentSignal))
      .concat(this.convertBBand(currentSignal))
      .concat(this.compareVwma(currentSignal.vwma, currentSignal.close))
      .concat(this.convertRecommendations(currentSignal));

    dataSetObj.output = [this.getOutput(currentSignal.close, signals[currentIndex + 30].close)];
    return dataSetObj;
  }
}

export default new IntradayPredicationService();
