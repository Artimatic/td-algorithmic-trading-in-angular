const express = require('express');
const handler = require('./quote.router');

const router = express.Router();

router.post('/', handler.quote);
router.post('/current', handler.currentQuote);
router.post('/raw', handler.rawQuote);
router.post('/intraday', handler.intraday);
router.post('/summary', handler.companySummary);
router.post('/optionchain', handler.optionChain);

module.exports = router;
