import { Router } from 'express';
import { connectMongo, UserModel, StreamModel, MuteModel } from '../../lib/mongo';
import mongoose from 'mongoose';
import { authMiddleware, AuthRequest } from '../../middlewares/auth.middleware';

const router = Router();

// Current user profile (401 if unauthenticated)
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  await connectMongo();
  const me: any = await UserModel.findById(req.user!.id).select({ email: 1, role: 1, username: 1 }).lean();
  if (!me) return res.status(404).json({ message: 'User not found' });
  return res.json({ id: req.user!.id, email: me.email || null, role: me.role, username: me.username || null });
});

router.post('/role', authMiddleware, async (req: AuthRequest, res) => {
  const { role } = req.body as { role: 'STREAMER' | 'AUDIENCE' };
  if (!role) return res.status(400).json({ message: 'role required' });
  await connectMongo();
  await UserModel.updateOne({ _id: req.user!.id }, { $set: { role } });
  return res.json({ ok: true, role });
});

router.post('/username', authMiddleware, async (req: AuthRequest, res) => {
  const { username } = req.body as { username: string };
  if (!username || !/^[a-z0-9_\.\-]{3,20}$/i.test(username)) return res.status(400).json({ message: 'invalid username' });
  await connectMongo();
  const exists = await UserModel.findOne({ username: new RegExp(`^${username}$`, 'i') }).select({ _id: 1 }).lean() as { _id?: any } | null;
  if (exists && exists._id && String(exists._id) !== req.user!.id) return res.status(409).json({ message: 'username taken' });
  await UserModel.updateOne({ _id: req.user!.id }, { $set: { username } });
  return res.json({ ok: true, username });
});

router.get('/streams/live', async (_req, res) => {
  await connectMongo();
  const items = await StreamModel.find({ status: 'LIVE' }).select({ title: 1, streamerId: 1, viewers: 1, createdAt: 1 }).lean();
  return res.json({ items });
});

router.post('/streams/:id/join', authMiddleware, async (req: AuthRequest, res) => {
  await connectMongo();
  const { id } = req.params;
  const stream = mongoose.Types.ObjectId.isValid(id)
    ? await StreamModel.findById(id).select({ _id: 1 }).lean()
    : await StreamModel.findOne({ streamKey: id }).select({ _id: 1 }).lean();
  if (!stream) return res.status(404).json({ ok: false, message: 'Stream not found' });
  await StreamModel.updateOne({ _id: (stream as any)._id }, { $inc: { viewers: 1 } });
  return res.json({ ok: true });
});

router.post('/streams/:id/leave', authMiddleware, async (req: AuthRequest, res) => {
  await connectMongo();
  const { id } = req.params;
  const stream = mongoose.Types.ObjectId.isValid(id)
    ? await StreamModel.findById(id).select({ _id: 1 }).lean()
    : await StreamModel.findOne({ streamKey: id }).select({ _id: 1 }).lean();
  if (!stream) return res.status(404).json({ ok: false, message: 'Stream not found' });
  await StreamModel.updateOne({ _id: (stream as any)._id, viewers: { $gt: 0 } }, { $inc: { viewers: -1 } });
  return res.json({ ok: true });
});

// Basic moderation shortcuts
router.post('/mute', authMiddleware, async (req: AuthRequest, res) => {
  const { userId } = req.body as { userId: string };
  if (!userId) return res.status(400).json({ message: 'userId required' });
  await connectMongo();
  await MuteModel.updateOne({ userId }, { $set: {} }, { upsert: true });
  return res.json({ ok: true });
});

router.post('/unmute', authMiddleware, async (req: AuthRequest, res) => {
  const { userId } = req.body as { userId: string };
  if (!userId) return res.status(400).json({ message: 'userId required' });
  await connectMongo();
  await MuteModel.deleteOne({ userId });
  return res.json({ ok: true });
});

export default router;
