import QuoteController from './quote.controller';

/**
 * Get quotes
 */
exports.quote = function (req, res, next) {
  QuoteController.getQuote(req, res);
};

exports.currentQuotes = function (req, res, next) {
  QuoteController.getCurrentQuote(req, res);
};

exports.price = function (req, res, next) {
  QuoteController.getPrice(req, res);
};

exports.rawQuote = function (req, res, next) {
  QuoteController.getRawData(req, res);
};

exports.intraday = function (req, res, next) {
  QuoteController.getIntraday(req, res);
};

exports.intradayv2 = function (req, res, next) {
  QuoteController.getIntradayV2(req, res);
};

exports.intradayTiingo = function (req, res, next) {
  QuoteController.getTiingoIntraday(req, res);
};

exports.postIntraday = function (req, res, next) {
  QuoteController.postIntraday(req, res);
};

exports.findIntraday = function (req, res) {
  QuoteController.findIntraday(req, res);
};

exports.companySummary = function (req, res, next) {
  QuoteController.getCompanySummary(req, res);
};

exports.optionChain = function (req, res, next) {
  QuoteController.getOptionChain(req, res);
};
