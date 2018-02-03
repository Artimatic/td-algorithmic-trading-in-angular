import * as express from 'express';
import * as handler from './portfolio.router';

const router = express.Router();

router.get('/', handler.portfolio);
router.get('/positions', handler.positions);
router.post('/login', handler.login);
router.post('/mfa', handler.mfaLogin);
router.post('/logout', handler.logout);
router.post('/resources', handler.getResources);

module.exports = router;
