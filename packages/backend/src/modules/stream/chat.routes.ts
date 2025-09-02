import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { authMiddleware, AuthRequest } from '../../middlewares/auth.middleware';
import rateLimit from 'express-rate-limit';

const router = Router();

const postLimiter = rateLimit({ windowMs: 10_000, max: 10 });

router.get('/:streamId/messages', async (req, res) => {
  const items = await prisma.chatMessage.findMany({
    where: { streamId: req.params.streamId },
    orderBy: { createdAt: 'asc' },
    take: 200,
  });
  res.json({ items });
});

router.post('/:streamId/messages', authMiddleware, postLimiter, async (req: AuthRequest, res) => {
  // Reject if muted
  const isMuted = await prisma.mute.findUnique({ where: { userId: req.user!.id } });
  if (isMuted) return res.status(403).json({ message: 'Muted' });

  const { text } = req.body as { text: string };
  if (!text?.trim()) return res.status(400).json({ message: 'Text required' });

  const msg = await prisma.chatMessage.create({
    data: { streamId: req.params.streamId, userId: req.user!.id, text: text.slice(0, 500) },
  });
  res.status(201).json({ item: msg });
});

export default router;
