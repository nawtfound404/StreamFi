import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import userRoutes from '../modules/users/user.routes';
import streamRoutes from '../modules/stream/stream.routes';
import monetizationRoutes from '../modules/monetization/monetization.routes';
import notificationRoutes from '../modules/notifications/notification.routes';
import vaultRoutes from '../modules/vaults/vault.routes'; 
import adminRoutes from '../modules/admin/admin.routes';

const router = Router();
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/stream', streamRoutes);
router.use('/monetization', monetizationRoutes);
router.use('/notifications', notificationRoutes);
router.use('/vaults', vaultRoutes);
router.use('/admin', adminRoutes);

export default router;