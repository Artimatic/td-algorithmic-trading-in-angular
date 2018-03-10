import { BacktestController } from './backtest.controller';

export let backtest = (request, response) => {
  BacktestController.backtest(request, response);
}

export let getMeanReversionChart = (request, response) => {
  BacktestController.getMeanReversionChart(request, response);
}

export let indicator = (request, response) => {
  BacktestController.getIndicator(request, response);
}