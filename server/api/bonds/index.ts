import * as express from 'express';
import BondsController from './bonds.controller';

const router = express.Router();

router.get('/10y2yspread', BondsController.getSpreadData);

module.exports = router;
