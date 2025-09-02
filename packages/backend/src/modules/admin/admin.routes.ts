import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { authMiddleware, AuthRequest } from '../../middlewares/auth.middleware';

const router = Router();

// Simple role-check middleware for admin-only routes
function requireAdmin(req: AuthRequest, res: any, next: any) {
  if (req.user?.role === 'ADMIN') return next();
  return res.status(403).json({ message: 'Forbidden' });
}

router.post('/mute', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  const { userId, reason } = req.body as { userId: string; reason?: string };
  if (!userId) return res.status(400).json({ message: 'userId required' });
  await prisma.mute.upsert({ where: { userId }, update: { reason }, create: { userId, reason } });
  return res.status(200).json({ ok: true });
});

router.post('/ban', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  const { userId, reason } = req.body as { userId: string; reason?: string };
  if (!userId) return res.status(400).json({ message: 'userId required' });
  await prisma.user.update({ where: { id: userId }, data: { banned: true, bannedAt: new Date(), banReason: reason } });
  return res.status(200).json({ ok: true });
});

router.post('/unban', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  const { userId } = req.body as { userId: string };
  if (!userId) return res.status(400).json({ message: 'userId required' });
  await prisma.user.update({ where: { id: userId }, data: { banned: false, bannedAt: null, banReason: null } });
  return res.status(200).json({ ok: true });
});

router.post('/unmute', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  const { userId } = req.body as { userId: string };
  if (!userId) return res.status(400).json({ message: 'userId required' });
  await prisma.mute.delete({ where: { userId } }).catch(() => void 0);
  return res.status(200).json({ ok: true });
});

export default router;
