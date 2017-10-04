const express = require('express');
const handler = require('./reversion.router');

const router = express.Router();

router.post('/', handler.reversion);
router.post('/backtest', handler.backtest);
router.post('/info', handler.backtestQuick);
router.post('/pricing', handler.pricing);

module.exports = router;
