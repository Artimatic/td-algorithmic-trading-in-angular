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
    let vxxDataSet: TrainingData[];
    let iwmDataSet: TrainingData[];
    let hygDataSet: TrainingData[];

    console.log('Getting SPY');
    return BacktestService.getTrainingData('SPY', endDate, startDate, false)
      .then(spyData => {
        spyDataSet = spyData;
        console.log('Getting QQQ');

        return BacktestService.getTrainingData('QQQ', endDate, startDate, false);
      })
      .then(qqqData => {
        qqqDataSet = qqqData;
        console.log('Getting TLT');

        return BacktestService.getTrainingData('TLT', endDate, startDate, false);
      })
      .then(tltData => {
        tltDataSet = tltData;
        console.log('Getting GLD');

        return BacktestService.getTrainingData('GLD', endDate, startDate, false);
      })
      .then(gldData => {
        gldDataSet = gldData;
        console.log('Getting VXX');

        return BacktestService.getTrainingData('VXX', endDate, startDate, false);
      })
      .then(vxxData => {
        vxxDataSet = vxxData;
        console.log('Getting IWM');

        return BacktestService.getTrainingData('IWM', endDate, startDate, false);
      })
      .then(iwmData => {
        iwmDataSet = iwmData;
        console.log('Getting HYG');

        return BacktestService.getTrainingData('HYG', endDate, startDate, false);
      })
      .then(hygData => {
        hygDataSet = hygData;
        console.log('Getting', symbol);

        return BacktestService.getTrainingData(symbol, endDate, startDate, false);
      })
      .then((targetData: any[]) => {
        // if (targetData.length === spyDataSet.length) {
        spyDataSet.forEach((spyData, idx) => {
          const target = targetData[idx];
          const qqq = qqqDataSet[idx];
          const tlt = tltDataSet[idx];
          const gld = gldDataSet[idx];
          const vxx = vxxDataSet[idx];
          const iwm = iwmDataSet[idx];
          const hyg = hygDataSet[idx];

          if (spyData &&
            qqq &&
            tlt &&
            gld &&
            vxx &&
            iwm &&
            hyg &&
            spyData.date === target.date &&
            qqq.date === target.date &&
            tlt.date === target.date &&
            gld.date === target.date &&
            vxx.date === target.date &&
            iwm.date === target.date &&
            hyg.date === target.date) {
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
              .concat(vxx.input.slice(1))
              .concat(iwm.input.slice(1))
              .concat(hyg.input.slice(1))
              .concat(target.input.slice(1));

            dataSetObj.output = target.output;

            finalDataSet.push(dataSetObj);
          } else {
            console.log('Error: ', spyData.date, qqq.date, tlt.date, gld.date, vxx.date, iwm.date, hyg.date, ' does not match ', target.date);
          }
        });

        return finalDataSet;
      });
  }

  trainWithIntraday(symbol) {
    const stocks = ['SPY', 'QQQ', 'TLT', 'GLD', 'VXX', 'IWM', 'HYG', symbol];
    const intradayQuotesPromises = [];
    const quotesPromises = [];
    const endDate = moment();
    const startDate = moment().subtract({ day: 1 });

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
              if (moment(datetime).diff(moment(quote.date), 'days') > 1) {
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

  buildDailyQuotes(symbol, startDate, endDate) {
    return QuoteService.getDailyQuotes(symbol, endDate, startDate)
      .then(quotes => {
        return PortfolioService.getIntradayV2(symbol, 1, 'minute', 1)
          .then(intradayQuotes => {
              const quote = quotes[quotes.length - 1];
              const intradayCandles = intradayQuotes.candles;
              const datetime =  intradayCandles[intradayCandles.length - 2].datetime;

              if (moment(datetime).diff(moment(quote.date), 'days') > 1) {
                console.log(moment(quote.date).diff(moment(datetime), 'days'), quote.date, moment(datetime).format());
                console.log(`The dates ${moment(quote.date).format()} ${moment(datetime).format()} are incorrect`);
              } else if (moment(datetime).diff(moment(quote.date), 'days') < 1) {

                const currentQuote = this.processIntraday(intradayCandles);
                const currentVolume = this.getVolume(intradayCandles);

                currentQuote.date = moment(intradayCandles[intradayCandles.length - 2].datetime).toISOString();
                currentQuote.volume = currentVolume;
                currentQuote.symbol = symbol;
                quotes[quotes.length - 1] = currentQuote;
              } else {
                const currentQuote = this.processIntraday(intradayCandles);
                const currentVolume = this.getVolume(intradayCandles);

                currentQuote.date = moment(intradayCandles[intradayCandles.length - 2].datetime).toISOString();
                currentQuote.volume = currentVolume;
                currentQuote.symbol = symbol;
                quotes = quotes.concat(currentQuote);
              }

              console.log('Yesterday: ', moment(quotes[quotes.length - 2].date).format(), 'Today: ', moment(quotes[quotes.length - 1].date).format());

            return quotes;
          });
      });
  }

  getVolume(intradayQuotes) {
    return intradayQuotes.reduce((accumulator, currentValue) => accumulator + currentValue.volume, 0);
  }

  buildTrainingData(quote, intradayQuotes) {
    const currentQuote = this.processIntraday(intradayQuotes);
    return this.compareQuotes(quote, currentQuote);
  }

  compareQuotes(previousQuote, currentQuote) {
    const input = [
      previousQuote.open > currentQuote.open ? 0 : 1,
      previousQuote.close > currentQuote.close ? 0 : 1,
      previousQuote.high > currentQuote.high ? 0 : 1,
      previousQuote.low > currentQuote.low ? 0 : 1,
    ];

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

  testModel(symbol, startDate, endDate, trainingSize = 0.7) {
    console.log('start - end: ', startDate, endDate);
    return BacktestService.trainV2Model(symbol, endDate, startDate, trainingSize);
  }

  async activateModel(symbol, startDate) {
    const today = moment(startDate).format('YYYY-MM-DD');
    const yesterday = moment(startDate).add(-1, 'days').format('YYYY-MM-DD');

    const trainingData = await this.train(symbol, yesterday, today);
    return BacktestService.activateV2Model(symbol, startDate, trainingData);
  }
}

export default new TrainingService();
