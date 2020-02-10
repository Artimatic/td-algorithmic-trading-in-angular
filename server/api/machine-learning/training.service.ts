import BacktestService from '../backtest/backtest.service';
import PortfolioService from '../portfolio/portfolio.service';

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
                .concat(spyData.input)
                .concat(qqq.input)
                .concat(tlt.input)
                .concat(gld.input)
                .concat(target.input);

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

  getTrainingDataFromIntraday(symbol, accountId) {
    const stocks = [symbol, 'SPY', 'QQQ', 'TLT', 'GLD'];
    const quotesPromises = [];

    for (const stock of stocks) {
      quotesPromises.push(PortfolioService.getIntraday(stock, accountId));
    }

    return Promise.all(quotesPromises);
  }

  testModel(symbol, endDate, startDate) {
    return BacktestService.trainV2Model(symbol, endDate, startDate);
  }

  activateModel(symbol, startDate) {
    BacktestService.activateV2Model(symbol, startDate);
  }
}

export default new TrainingService();
