const QuoteController = require('./quote.controller');

/**
 * Get quotes
 */
exports.quote = function (req, res, next) {
  QuoteController.getQuote(req, res);
};

exports.currentQuote = function (req, res, next) {
  QuoteController.getCurrentQuote(req, res);
};

exports.rawQuote = function (req, res, next) {
  QuoteController.getRawData(req, res);
};
