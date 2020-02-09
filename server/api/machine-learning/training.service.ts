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

    return BacktestService.getTrainingData('SPY', endDate, startDate, false)
      .then(spyData => {
        spyDataSet = spyData;
        return BacktestService.getTrainingData(symbol, endDate, startDate, false);
      })
      .then((targetData: any[]) => {
        // if (targetData.length === spyDataSet.length) {
          spyDataSet.forEach((spyData, idx) => {
            const target = targetData[idx];
            if (spyData.date === target.date) {
              const dataSetObj = {
                date: null,
                input: null,
                output: null
              };
              const day = new Date(target.date).getUTCDay();

              dataSetObj.date = target.date;
              dataSetObj.input = [day]
                .concat(spyData.input)
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
