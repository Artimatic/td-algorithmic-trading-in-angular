const express = require('express');
import ServerSmsController from './server-sms.controller';

const router = express.Router();

router.post('/buy', ServerSmsController.smsBuy);
router.post('/sell', ServerSmsController.smsSell);

module.exports = router;
