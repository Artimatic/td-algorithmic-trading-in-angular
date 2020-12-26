import * as RequestPromise from 'request-promise';

const dataUrl = 'https://quote.cnbc.com/quote-html-webservice/quote.htm';

class BondsService {
  get10y2ySpread() {
    const url = `${dataUrl}`;

    const options = {
      method: 'GET',
      uri: url,
      qs: {
        symbols: '10Y2YS',
        partnerId: 2,
        requestMethod: 'quick',
        exthrs: 1,
        noform: 1,
        fund: 1,
        output: 'jsonp',
        events: 1,
        '-': 'c8146822',
        callback: 'quoteHandler1'
      },
    };

    return RequestPromise(options)
      .then((data) => {
        data = data.replace('quoteHandler1(', '');
        data = data.replace('})', '}');
        return JSON.parse(data);
      });
  }
}

export default new BondsService();
