import { Router } from 'express';
import { getSettings, updateSettings } from './user.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
const router = Router();
router.use(authMiddleware);
router.get('/settings', getSettings);
router.post('/settings', updateSettings);
export default router;
