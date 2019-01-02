import * as express from 'express';
const handler = require('./quote.router');

const router = express.Router();

router.post('/', handler.quote);
router.post('/current', handler.currentQuotes);
router.post('/price', handler.price);
router.post('/raw', handler.rawQuote);
router.post('/intraday', handler.intraday);
router.post('/intraday2', handler.intradayv2);
router.post('/historical-intraday', handler.postIntraday);
router.get('/historical-intraday', handler.findIntraday);
router.post('/optionchain', handler.optionChain);
router.post('/intraday-tiingo', handler.intradayTiingo);

module.exports = router;
