const QuoteController = require('./quote.controller');

/**
 * Get quotes
 */
exports.quote = function (req, res, next) {
  QuoteController.getQuote(req, res);
};
