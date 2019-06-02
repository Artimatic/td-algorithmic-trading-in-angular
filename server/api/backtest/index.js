import * as express from 'express';
import * as handler from './backtest.router';
import BacktestController from './backtest.controller';

const router = express.Router();

router.post('/', handler.backtest);
router.post('/indicator', handler.indicator);
router.post('/chart', handler.getMeanReversionChart);
router.post('/bbands', handler.bollingerBands);
router.post('/sma', handler.sma);
router.post('/roc', handler.roc);
router.post('/infov2', handler.infoV2);
router.post('/infov2chart', handler.infoV2Chart);
router.post('/timeline', handler.timeline);
router.post('/mfi', handler.mfi);
router.post('/vwma', handler.vwma);
router.get('/data-status', BacktestController.getDataStatus);
router.get('/analysis-status', BacktestController.getAnalysisStatus);
router.post('/rnn', BacktestController.getRNNPrediction);

module.exports = router;
