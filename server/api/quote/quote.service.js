import google from '../../components/google-finance';
import _ from 'lodash';

import errors from '../../components/errors/baseErrors';

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
