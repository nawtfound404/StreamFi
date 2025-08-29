import { Router } from 'express';
import { getNotifications, markRead } from './notification.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
const router = Router();
router.use(authMiddleware);
router.get('/', getNotifications);
router.post('/read', markRead);
export default router;