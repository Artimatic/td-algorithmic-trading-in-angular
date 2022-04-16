import * as express from 'express';
import MachineLearningController from './machine-learning.controller';

const router = express.Router();

router.get('/train', MachineLearningController.getTrainingDataSetV2);
router.get('/guess-activate', MachineLearningController.activateWithIntradayData);
router.get('/test-model', MachineLearningController.testV2Model);
router.get('/activate', MachineLearningController.activateV2Model);
router.get('/v3/train', MachineLearningController.trainV3);
router.get('/v3/train-daily', MachineLearningController.trainDailyV3);
router.get('/v3/activate', MachineLearningController.activateV3);
router.get('/v3/quotes', MachineLearningController.getQuotes);
router.post('/v3/indicators', MachineLearningController.getIndicators);
router.post('/v3/activate-model', MachineLearningController.activateModel);
router.get('/v3/activate-daily', MachineLearningController.activateDailyV3);
router.get('/v4/activate-daily', MachineLearningController.activateDailyV4);
router.get('/v4/train-daily', MachineLearningController.trainDailyV4);
router.get('/v4/score-daily', MachineLearningController.scoreDailyV4);

module.exports = router;
