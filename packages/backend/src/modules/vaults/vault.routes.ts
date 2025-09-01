import { Router } from 'express';
import { createVault } from './vault.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';

const router = Router();

// This route is protected. Only a logged-in user can access it.
router.post('/', authMiddleware, createVault);

export default router;