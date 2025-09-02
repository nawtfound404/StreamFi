import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../../middlewares/auth.middleware';

const router = Router();

// Simple role-check middleware for admin-only routes
function requireAdmin(req: AuthRequest, res: any, next: any) {
  if (req.user?.role === 'ADMIN') return next();
  return res.status(403).json({ message: 'Forbidden' });
}

router.post('/mute', authMiddleware, requireAdmin, (_req: Request, res: Response) => {
  return res.status(200).json({ ok: true });
});

router.post('/ban', authMiddleware, requireAdmin, (_req: Request, res: Response) => {
  return res.status(200).json({ ok: true });
});

export default router;
