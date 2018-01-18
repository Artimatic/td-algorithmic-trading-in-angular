import * as express from 'express';
import * as handler from './backtest.router';

const router = express.Router();

router.post('/', handler.backtest);
router.post('/chart', handler.getMeanReversionChart);

module.exports = router;
