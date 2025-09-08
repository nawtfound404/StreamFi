import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authMiddleware, AuthRequest } from '../../middlewares/auth.middleware';
import { ChatMessageModel, MuteModel, StreamModel, connectMongo } from '../../lib/mongo';
import mongoose from 'mongoose';
import { emitToStreamRooms } from '../../lib/socket';

const router = Router();

const postLimiter = rateLimit({ windowMs: 10_000, max: 10 });

router.get('/:streamId/messages', async (req, res) => {
  await connectMongo();
  const sid = req.params.streamId;
  const stream = mongoose.Types.ObjectId.isValid(sid)
    ? await StreamModel.findById(sid).select({ _id: 1 }).lean()
    : await StreamModel.findOne({ streamKey: sid }).select({ _id: 1 }).lean();
  if (!stream) return res.status(404).json({ items: [] });
  const streamId = new mongoose.Types.ObjectId(String((stream as any)._id));
  const items = await ChatMessageModel.find({ streamId })
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
  // Allow using either the Mongo _id or the public streamKey
  const stream = mongoose.Types.ObjectId.isValid(sid)
    ? await StreamModel.findById(sid).select({ _id: 1, streamKey: 1 }).lean()
    : await StreamModel.findOne({ streamKey: sid }).select({ _id: 1, streamKey: 1 }).lean();
  if (!stream) return res.status(404).json({ message: 'Stream not found' });

  const streamId = new mongoose.Types.ObjectId(String((stream as any)._id));
  const userId = new mongoose.Types.ObjectId(String(uid));
  const msg = await ChatMessageModel.create({ streamId, userId, text: text.trim().slice(0, 500) });
  // Broadcast to both rooms (id and key) for connected clients
  emitToStreamRooms({ id: String((stream as any)._id), key: (stream as any).streamKey }, 'chat_message', {
    id: String((msg as any)._id),
    user: String(uid),
    text: (msg as any).text,
    at: new Date((msg as any).createdAt).getTime(),
  });
  res.status(201).json({ item: msg });
});

export default router;
