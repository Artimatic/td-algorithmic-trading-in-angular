import BacktestService from '../backtest/backtest.service';

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
        return BacktestService.getTrainingData(symbol, endDate, startDate, false);
      })
      .then((targetData: any[]) => {
        // if (targetData.length === spyDataSet.length) {
          spyDataSet.forEach((spyData, idx) => {
            const target = targetData[idx];
            const qqq = qqqDataSet[idx];
            const tlt = tltDataSet[idx];

            if (spyData.date === target.date &&
                qqq.date === target.date &&
                tlt.date === target.date) {
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
                .concat(target.input);

              dataSetObj.output = target.output;

              finalDataSet.push(dataSetObj);
            } else {
              console.log(spyData.date, ' does not match ', target.date);
            }
          });
        // } else {
        //   throw Error('SPY data history size does not match the target history size.');
        // }

        return finalDataSet;
      });

  }
}

export default new TrainingService();
