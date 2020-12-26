import * as express from 'express';
import StockInfoController from './stock-info.controller';

const router = express.Router();

router.get('/test', StockInfoController.test);

module.exports = router;
