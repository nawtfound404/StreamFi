import { Router } from 'express';
import { login, signup, getMe } from './auth.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
const router = Router();
router.post('/login', login);
router.post('/signup', signup);
router.get('/me', authMiddleware, getMe);
export default router;
