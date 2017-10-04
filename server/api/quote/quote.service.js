const google = require('google-finance');

const _ = require('lodash');

const errors = require('../../components/errors/baseErrors');

class QuoteService {
    getData(ticker, start, end) {
        return google.historical({
            symbol: ticker,
            from: String(start),
            to: String(end)
        });
    }
}

module.exports = new QuoteService();
