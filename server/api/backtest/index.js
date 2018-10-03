import * as express from 'express';
import * as handler from './backtest.router';

const router = express.Router();

router.post('/', handler.backtest);
router.post('/indicator', handler.indicator);
router.post('/chart', handler.getMeanReversionChart);
router.post('/bbands', handler.bollingerBands);
router.post('/infov2', handler.infoV2);
router.post('/infov2chart', handler.infoV2Chart);
router.post('/timeline', handler.timeline);

module.exports = router;
