import * as express from 'express';
import MachineLearningController from './machine-learning.controller';

const router = express.Router();

router.get('/train', MachineLearningController.getTrainingDataSetV2);
router.get('/guess-activate', MachineLearningController.activateWithIntradayData);
router.get('/test-model', MachineLearningController.testV2Model);
router.get('/activate', MachineLearningController.activateV2Model);

module.exports = router;
