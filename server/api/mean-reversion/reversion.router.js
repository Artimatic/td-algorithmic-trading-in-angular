import ReversionController from './reversion.controller';

exports.reversion = function (req, res, next) {
  ReversionController.getAlgoData(req, res);
};

exports.backtest = function (req, res, next) {
  ReversionController.runBacktest(req, res);
};

exports.backtestQuick = function (req, res, next) {
  ReversionController.runBacktestQuick(req, res);
};

exports.pricing = function (req, res, next) {
  ReversionController.getPrice(req, res);
};
