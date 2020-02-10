import * as express from 'express';
import MachineLearningController from './machine-learning.controller';

const router = express.Router();

router.get('/train', MachineLearningController.getTrainingDataSetV2);
router.get('/intraday-data', MachineLearningController.getIntradayTrainingData);
router.get('/test-model', MachineLearningController.testV2Model);
router.get('/activate', MachineLearningController.activateV2Model);

module.exports = router;
