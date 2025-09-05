import { Router } from 'express';
import { authBurstLimiter } from '../middlewares/rateLimiter';
import authRoutes from '../modules/auth/auth.routes';
import userRoutes from '../modules/users/user.routes';
import streamRoutes from '../modules/stream/stream.routes';
import monetizationRoutes from '../modules/monetization/monetization.routes';
import notificationRoutes from '../modules/notifications/notification.routes';
import vaultRoutes from '../modules/vaults/vault.routes'; 
import adminRoutes from '../modules/admin/admin.routes';
import chatRoutes from '../modules/stream/chat.routes';
import paymentsRoutes from '../modules/monetization/payments.routes';
import yellowRoutes from '../modules/yellow/yellow.routes';

const router = Router();
router.use('/auth', authBurstLimiter, authRoutes);
router.use('/users', userRoutes);
router.use('/stream', streamRoutes);
router.use('/monetization', monetizationRoutes);
router.use('/notifications', notificationRoutes);
router.use('/vaults', vaultRoutes);
router.use('/admin', adminRoutes);
router.use('/chat', chatRoutes);
router.use('/payments', authBurstLimiter, paymentsRoutes);
router.use('/yellow', yellowRoutes);

export default router;