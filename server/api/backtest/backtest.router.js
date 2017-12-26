import { BacktestController } from './backtest.controller';

export let backtest = (request, response) => {
  BacktestController.backtest(request, response);
}

