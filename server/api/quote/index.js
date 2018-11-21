const express = require('express');
const handler = require('./quote.router');

const router = express.Router();

router.post('/', handler.quote);
router.post('/current', handler.currentQuotes);
router.post('/price', handler.price);
router.post('/raw', handler.rawQuote);
router.post('/intraday', handler.intraday);
router.post('/intraday2', handler.intradayv2);
router.post('/intraday-quote', handler.postIntraday);
router.post('/summary', handler.companySummary);
router.post('/optionchain', handler.optionChain);

module.exports = router;
