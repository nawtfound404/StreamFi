import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requireStreamer } from '../../middlewares/rbac.middleware';
import { ReactionModel, StreamModel, connectMongo } from '../../lib/mongo';
import mongoose from 'mongoose';

const router = Router();

// Public: list reactions by stream id (viewer use-case)
router.get('/by-stream/:id', async (req, res) => {
  await connectMongo();
  const { id } = req.params;
  const sid = mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id;
  const stream = await StreamModel.findById(sid).lean();
  if (!stream) return res.status(404).json({ message: 'stream not found' });
  const items = await ReactionModel.find({ streamerId: (stream as any).streamerId }).sort({ createdAt: 1 }).lean();
  return res.status(200).json(items.map(i => ({ key: i.key, label: i.label, priceInPaise: i.priceInPaise })));
});

// List reactions for current streamer
router.get('/', authMiddleware, requireStreamer, async (req, res) => {
  await connectMongo();
  const streamerId = (req as any).user?.id as string;
  const sid = mongoose.Types.ObjectId.isValid(streamerId) ? new mongoose.Types.ObjectId(streamerId) : streamerId;
  const items = await ReactionModel.find({ streamerId: sid }).sort({ createdAt: 1 }).lean();
  return res.status(200).json(items);
});

// Upsert reaction (create or update by key)
router.post('/', authMiddleware, requireStreamer, async (req, res) => {
  await connectMongo();
  const streamerId = (req as any).user?.id as string;
  const { key, label } = req.body as { key: string; label: string };
  const priceInPaise = Math.max(0, Number((req.body as any).priceInPaise || 0));
  if (!key || !/^[a-z0-9_-]{1,32}$/.test(key)) return res.status(400).json({ message: 'invalid key' });
  if (!label || label.length > 64) return res.status(400).json({ message: 'invalid label' });
  const sid = mongoose.Types.ObjectId.isValid(streamerId) ? new mongoose.Types.ObjectId(streamerId) : streamerId;
  const doc = await ReactionModel.findOneAndUpdate(
    { streamerId: sid, key },
    { $set: { label, priceInPaise } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();
  return res.status(200).json(doc);
});

// Delete reaction by key
router.delete('/:key', authMiddleware, requireStreamer, async (req, res) => {
  await connectMongo();
  const streamerId = (req as any).user?.id as string;
  const { key } = req.params;
  if (!key) return res.status(400).json({ message: 'key required' });
  const sid = mongoose.Types.ObjectId.isValid(streamerId) ? new mongoose.Types.ObjectId(streamerId) : streamerId;
  await ReactionModel.deleteOne({ streamerId: sid, key });
  return res.status(200).json({ ok: true });
});

export default router;