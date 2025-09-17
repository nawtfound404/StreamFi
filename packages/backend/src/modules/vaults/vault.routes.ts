import { Router } from 'express';
import { createVault } from './vault.controller';
import { relayWithdraw } from './withdraw.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';

const router = Router();

// This route is protected. Only a logged-in user can access it.
router.post('/', authMiddleware, createVault);
router.post('/withdraw', authMiddleware, relayWithdraw);

export default router;