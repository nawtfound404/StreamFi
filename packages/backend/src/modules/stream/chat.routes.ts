import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authMiddleware, AuthRequest } from '../../middlewares/auth.middleware';
import { ChatMessageModel, MuteModel, connectMongo } from '../../lib/mongo';
import mongoose from 'mongoose';

const router = Router();

const postLimiter = rateLimit({ windowMs: 10_000, max: 10 });

router.get('/:streamId/messages', async (req, res) => {
  await connectMongo();
  const sid = req.params.streamId;
  const streamId = mongoose.Types.ObjectId.isValid(sid) ? new mongoose.Types.ObjectId(sid) : undefined;
  const items = await ChatMessageModel.find(streamId ? { streamId } : { streamId: sid })
    .sort({ createdAt: 1 })
    .limit(200)
    .lean();
  res.json({ items });
});

router.post('/:streamId/messages', authMiddleware, postLimiter, async (req: AuthRequest, res) => {
  await connectMongo();
  // Reject if muted
  const uid = req.user!.id;
  const isMuted = await MuteModel.findOne({ userId: uid }).lean();
  if (isMuted) return res.status(403).json({ message: 'Muted' });

  const { text } = req.body as { text: string };
  if (!text?.trim()) return res.status(400).json({ message: 'Text required' });

  const sid = req.params.streamId;
  const streamId = mongoose.Types.ObjectId.isValid(sid) ? new mongoose.Types.ObjectId(sid) : sid;
  const userId = mongoose.Types.ObjectId.isValid(uid) ? new mongoose.Types.ObjectId(uid) : uid;
  const msg = await ChatMessageModel.create({ streamId, userId, text: text.slice(0, 500) });
  res.status(201).json({ item: msg });
});

export default router;
