import { Router } from 'express';
import { connectMongo, StreamModel } from '../../lib/mongo';
import { emitToStreamRooms } from '../../lib/socket';

const router = Router();

// These endpoints can be called by the Node Media Server container via internal network
router.post('/publish', async (req, res) => {
  try {
    const { key } = req.body as { key?: string };
    if (!key) return res.status(400).json({ ok: false });
    await connectMongo();
    const stream = await StreamModel.findOneAndUpdate(
      { streamKey: key },
      { $set: { status: 'LIVE', startedAt: new Date() } },
      { new: true }
    ).lean();
    if (stream) emitToStreamRooms({ id: String((stream as any)._id), key }, 'stream_status', { status: 'LIVE' });
    return res.json({ ok: true });
  } catch { return res.status(500).json({ ok: false }); }
});

router.post('/unpublish', async (req, res) => {
  try {
    const { key } = req.body as { key?: string };
    if (!key) return res.status(400).json({ ok: false });
    await connectMongo();
    const stream = await StreamModel.findOneAndUpdate(
      { streamKey: key },
      { $set: { status: 'IDLE', endedAt: new Date() } },
      { new: true }
    ).lean();
    if (stream) emitToStreamRooms({ id: String((stream as any)._id), key }, 'stream_status', { status: 'IDLE' });
    return res.json({ ok: true });
  } catch { return res.status(500).json({ ok: false }); }
});

export default router;
