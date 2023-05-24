const express = require('express');
import * as handler from './portfolio.router';

const router = express.Router();

router.get('/', handler.portfolio);
router.get('/positions', handler.positions);
router.get('/intraday', handler.intraday);
router.get('/v2/intraday', handler.intradayV2);
router.get('/quote', handler.quote);
router.get('/daily-quote', handler.dailyQuote);
router.get('/v2/positions', handler.tdPosition);
router.get('/balance', handler.tdBalance);
router.get('/v3/equity-hours', handler.getEquityMarketHours);
router.post('/login', handler.login);
router.post('/mfa', handler.mfaLogin);
router.post('/logout', handler.logout);
router.post('/resources', handler.getResources);
router.post('/sell', handler.sell);
router.post('/buy', handler.buy);
router.post('/instruments', handler.instruments);
router.post('/v2/buy', handler.tdBuy);
router.post('/v2/sell', handler.tdSell);
router.post('/v3/set-account', handler.setAccount);
router.post('/v3/check-account', handler.checkAccount);
router.post('/v3/delete-cred', handler.checkAccount);

module.exports = router;
