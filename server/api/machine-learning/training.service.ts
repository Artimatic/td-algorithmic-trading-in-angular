import * as moment from 'moment';
import BacktestService from '../backtest/backtest.service';
import PortfolioService from '../portfolio/portfolio.service';
import QuoteService from '../quote/quote.service';

export interface TrainingData {
  date: string;
  input: number[];
  output: number[];
}

class TrainingService {
  train(symbol, startDate, endDate) {
    const finalDataSet: TrainingData[] = [];
    let spyDataSet: TrainingData[];
    let qqqDataSet: TrainingData[];
    let tltDataSet: TrainingData[];
    let gldDataSet: TrainingData[];

    return BacktestService.getTrainingData('SPY', endDate, startDate, false)
      .then(spyData => {
        spyDataSet = spyData;
        return BacktestService.getTrainingData('QQQ', endDate, startDate, false);
      })
      .then(qqqData => {
        qqqDataSet = qqqData;
        return BacktestService.getTrainingData('TLT', endDate, startDate, false);
      })
      .then(tltData => {
        tltDataSet = tltData;
        return BacktestService.getTrainingData('GLD', endDate, startDate, false);
      })
      .then(gldData => {
        gldDataSet = gldData;
        return BacktestService.getTrainingData(symbol, endDate, startDate, false);
      })
      .then((targetData: any[]) => {
        // if (targetData.length === spyDataSet.length) {
        spyDataSet.forEach((spyData, idx) => {
          const target = targetData[idx];
          const qqq = qqqDataSet[idx];
          const tlt = tltDataSet[idx];
          const gld = gldDataSet[idx];

          if (spyData.date === target.date &&
            qqq.date === target.date &&
            tlt.date === target.date &&
            gld.date === target.date) {
            const dataSetObj = {
              date: null,
              input: null,
              output: null
            };
            const day = new Date(target.date).getUTCDay();

            dataSetObj.date = target.date;
            dataSetObj.input = [day]
              .concat(spyData.input.slice(1))
              .concat(qqq.input.slice(1))
              .concat(tlt.input.slice(1))
              .concat(gld.input.slice(1))
              .concat(target.input.slice(1));

            dataSetObj.output = target.output;

            finalDataSet.push(dataSetObj);
          } else {
            console.log(spyData.date, qqq.date, tlt.date, gld.date, ' does not match ', target.date);
          }
        });
        // } else {
        //   throw Error('SPY data history size does not match the target history size.');
        // }

        return finalDataSet;
      });
  }

  trainWithIntraday(symbol) {
    const stocks = ['SPY', 'QQQ', 'TLT', 'GLD', symbol];
    const intradayQuotesPromises = [];
    const quotesPromises = [];
    const endDate = moment().subtract({ day: 1 });
    const startDate = moment().subtract({ day: 2 });

    for (const stock of stocks) {
      intradayQuotesPromises.push(PortfolioService.getIntradayV2(stock));
    }

    for (const stock of stocks) {
      quotesPromises.push(QuoteService.getDailyQuotes(stock, endDate, startDate));
    }

    return Promise.all(quotesPromises)
      .then(quotes => {
        return Promise.all(intradayQuotesPromises)
          .then(intradayQuotes => {
            let input = [new Date().getUTCDay()];
            quotes.forEach((val, idx) => {
              const quote = val[val.length - 2]; // TODO CHANGE TO -1
              const intraday = intradayQuotes[idx].candles;
              const datetime =  intraday[intraday.length - 2].datetime;
              if (moment(datetime).diff(moment(quote.date), 'days') !== 1) {
                console.log(moment(quote.date).diff(moment(datetime), 'days'), quote.date, moment(datetime).format());
                console.log(`The dates ${moment(quote.date).format()} ${moment(datetime).format()} are incorrect`);
              }
              input = input.concat(this.buildTrainingData(quote, intraday));
            });

            return [{input}];
          })
          .then(trainingData => {
            return BacktestService.activateV2Model(symbol, startDate, trainingData);
          });
      });
  }

  buildTrainingData(quote, intradayQuotes) {
    const currentQuote = this.processIntraday(intradayQuotes);
    console.log('intraday quote: ', currentQuote);
    console.log('previous quote: ', quote);

    const input = [
      quote.open > currentQuote.open ? 0 : 1,
      quote.close > currentQuote.close ? 0 : 1,
      quote.high > currentQuote.high ? 0 : 1,
      quote.low > currentQuote.low ? 0 : 1,
    ];
    console.log('processed: ', input);

    return input;
  }

  processIntraday(intradayQuotes) {
    const accumulator = {
      volume: 0,
      open: null,
      close: intradayQuotes[intradayQuotes.length - 2].close,
      high: null,
      low: null,
    };

    return intradayQuotes.reduce((acc, curr) => {
      if (!acc.open) {
        acc.open = curr.open;
        acc.high = curr.high;
        acc.low = curr.low;
      } else {
        acc.high = curr.high > acc.high ? curr.high : acc.high;
        acc.low = curr.low < acc.low ? curr.low : acc.low;
      }
      return acc;
    }, accumulator);
  }

  testModel(symbol, startDate, endDate) {
    console.log('start - end: ', startDate, endDate);
    return BacktestService.trainV2Model(symbol, endDate, startDate);
  }

  async activateModel(symbol, startDate) {
    const today = moment(startDate).format('YYYY-MM-DD');
    const yesterday = moment(startDate).add(-1, 'days').format('YYYY-MM-DD');

    const trainingData = await this.train(symbol, yesterday, today);
    return BacktestService.activateV2Model(symbol, startDate, trainingData);
  }
}

export default new TrainingService();
