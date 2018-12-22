import * as express from 'express';
const router = express.Router();

import ReversionController from './reversion.controller';

router.post('/', ReversionController.getAlgoData);
router.post('/backtest', ReversionController.runBacktest);
router.post('/info', ReversionController.runBacktestQuick);

module.exports = router;
