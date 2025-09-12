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
import reactionsRoutes from '../modules/reactions/reactions.routes';
import nmsRoutes from '../modules/stream/nms.routes';
import { connectMongo, UserModel } from '../lib/mongo';
import jwt from 'jsonwebtoken';
import { env } from '../config/environment';

const router = Router();
router.use('/auth', authBurstLimiter, authRoutes);
router.use('/stream', streamRoutes);
router.use('/monetization', monetizationRoutes);
router.use('/notifications', notificationRoutes);
router.use('/vaults', vaultRoutes);
router.use('/admin', adminRoutes);
router.use('/chat', chatRoutes);
router.use('/users', userRoutes);
router.use('/payments', authBurstLimiter, paymentsRoutes);
router.use('/yellow', yellowRoutes);
router.use('/reactions', reactionsRoutes);
router.use('/nms', nmsRoutes);

// Lightweight diagnostic endpoint (non-sensitive). Remove in production.
router.get('/debug/db', async (_req, res) => {
	try {
		const conn = await connectMongo();
		const state = conn.readyState; // 1 = connected
		const userCount = await UserModel.estimatedDocumentCount();
		return res.json({ ok: true, state, userCount, db: conn.name });
	} catch (e: any) {
		return res.status(500).json({ ok: false, error: e.message });
	}
});

// Quick auth debug: verifies a provided token (Authorization: Bearer <token>)
router.get('/debug/auth', async (req, res) => {
	const auth = req.headers.authorization;
	if (!auth?.startsWith('Bearer ')) return res.status(400).json({ ok: false, error: 'Missing bearer token' });
	const token = auth.slice(7);
	try {
		const decoded = jwt.verify(token, env.jwt.secret) as any;
		const user = await UserModel.findById(decoded.id).select('email role').lean();
		return res.json({ ok: true, decoded: { id: decoded.id, role: decoded.role }, exists: !!user });
	} catch (e: any) {
		return res.status(401).json({ ok: false, error: e.message });
	}
});

export default router;