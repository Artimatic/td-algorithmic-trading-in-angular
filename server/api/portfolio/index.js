import * as express from 'express';
import * as handler from './portfolio.router';

const router = express.Router();

router.get('/', handler.portfolio);
router.get('/positions', handler.positions);
router.get('/intraday', handler.intraday);
router.get('/quote', handler.quote);
router.get('/daily-quote', handler.dailyQuote);
router.post('/login', handler.login);
router.post('/mfa', handler.mfaLogin);
router.post('/logout', handler.logout);
router.post('/resources', handler.getResources);
router.post('/sell', handler.sell);
router.post('/buy', handler.buy);
router.post('/instruments', handler.instruments);
router.post('/v2/buy', handler.tdBuy);
router.post('/v2/sell', handler.tdSell);

module.exports = router;
