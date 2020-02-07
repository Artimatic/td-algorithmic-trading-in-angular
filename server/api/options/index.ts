import * as express from 'express';
import OptionsController from './options.controller';

const router = express.Router();

router.get('/implied-move', OptionsController.getImpliedMove);

module.exports = router;
