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

export let bollingerBands = (request, response) => {
  BacktestController.getBollingerBands(request, response);
}

export let infoV2 = (request, response) => {
  BacktestController.getInfoV2(request, response);
}

export let infoV2Chart = (request, response) => {
  BacktestController.getInfoV2Chart(request, response);
}