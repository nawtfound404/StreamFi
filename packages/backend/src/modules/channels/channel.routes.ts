import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { openChannel, verifyAndApplyTip, closeChannelCooperative } from '../../services/channel.service';
import { yellowService } from '../../services/yellow.service';
import { env } from '../../config/environment';
import { emitToStream } from '../../lib/socket';
import { ChannelModel, connectMongo } from '../../lib/mongo';
import { ethers } from 'ethers';

const router = Router();
router.use(authMiddleware);
// DEV ONLY: force delete an existing channel to allow reopening with a different viewer
if (process.env.NODE_ENV !== 'production') {
  router.delete('/:id', async (req, res) => {
    try {
      await connectMongo();
      const ch = await ChannelModel.findOne({ channelId: req.params.id }).lean();
      if (!ch) return res.status(404).json({ message: 'not found' });
      if ((ch as any).status === 'OPEN') {
        await ChannelModel.deleteOne({ channelId: req.params.id });
        return res.json({ ok: true, deleted: true });
      }
      return res.status(400).json({ message: 'cannot delete non-OPEN channel' });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });
}

// Simple in-memory rate limiter for tips (per viewer+channel) to prevent spam
const tipRateLimiter = (() => {
  const WINDOW_MS = 5000; // 5s window
  const MAX_EVENTS = 15; // max tips per window
  const buckets = new Map<string, { count: number; ts: number }>();
  return (req: any, res: any, next: any) => {
    const viewer = (req.user?.walletAddress || req.user?.address || 'unknown').toLowerCase();
    const channelId = req.params.id || req.body?.channelId || 'none';
    const key = viewer + ':' + channelId;
    const now = Date.now();
    const entry = buckets.get(key);
    if (!entry || now - entry.ts > WINDOW_MS) {
      buckets.set(key, { count: 1, ts: now });
      return next();
    }
    if (entry.count >= MAX_EVENTS) {
      return res.status(429).json({ message: 'tip rate exceeded' });
    }
    entry.count++;
    return next();
  };
})();

// GET /channels/stream/:streamId/init -> vault/channel config (lightweight, public-ish but requires auth for viewer context)
router.get('/stream/:streamId/init', async (req, res) => {
  try {
    const user = (req as any).user;
    await connectMongo();
  const { StreamModel, UserModel } = await import('../../lib/mongo.js');
    const stream = await StreamModel.findById(req.params.streamId).lean();
    if (!stream) return res.status(404).json({ message: 'stream not found' });
    const streamer = await UserModel.findById((stream as any).streamerId).lean();
    const vaultId = (streamer as any)?.vaultId ?? null;
  return res.json({
      streamId: req.params.streamId,
      vaultId,
      channelContract: env.yellow.channelContract,
      chainId: env.yellow.chainId,
      minDepositWei: env.yellow.minChannelDepositWei.toString?.() || String(env.yellow.minChannelDepositWei),
      minTipWei: env.yellow.minTipWei.toString?.() || String(env.yellow.minTipWei),
      viewerHasWallet: !!(user?.walletAddress),
    });
  } catch (e: any) { return res.status(500).json({ message: e.message }); }
});

// POST /channels/open { streamId, depositWei }
router.post('/open', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: 'unauthorized' });
    const { streamId, depositWei, viewer: viewerOverride } = req.body as { streamId: string; depositWei: string; viewer?: string };
    if (!streamId || !depositWei) return res.status(400).json({ message: 'streamId & depositWei required' });
    const bn = BigInt(depositWei);
    if (bn < BigInt(env.yellow.minChannelDepositWei)) return res.status(400).json({ message: 'deposit below minimum' });
    // Prefer explicit viewer override if provided and looks like an address; else fallback to authenticated user's wallet
    const headerViewer = String(req.headers['x-viewer-address'] || '').toLowerCase();
    const viewer = (viewerOverride?.toLowerCase() && viewerOverride.startsWith('0x')
      ? viewerOverride.toLowerCase()
      : (headerViewer.startsWith('0x') ? headerViewer : (user.walletAddress || user.address || '')).toLowerCase());
    if (!viewer.startsWith('0x')) return res.status(400).json({ message: 'viewer wallet missing' });
    let opened = await openChannel({ viewer, streamId, depositWei: bn });
    // If server indicates reuse, but the record is CLOSED/CLOSING, re-open it by resetting state
    if (opened.reused) {
      await connectMongo();
      const existing: any = await ChannelModel.findOne({ channelId: opened.channelId }).lean();
      if (existing && existing.status !== 'OPEN') {
        await ChannelModel.updateOne(
          { channelId: opened.channelId },
          {
            $set: {
              status: 'OPEN',
              depositWei: bn.toString(),
              spentWei: '0',
              nonce: 0,
            },
            $unset: { lastSig: "" },
          }
        );
        opened = { ...opened, reused: false, record: { ...existing, streamerVaultId: existing.streamerVaultId } } as any;
      }
    }
    // Fire on-chain openChannel tx (admin signer) only when newly created
    let txHash: string | null = null;
    if (!opened.reused && opened.record?.streamerVaultId) {
      const vaultId = BigInt(opened.record.streamerVaultId);
      try {
        const onchain = await yellowService.openChannel(viewer, streamId, vaultId, bn);
        txHash = onchain.txHash;
      } catch (e) {
        // Non-fatal in dev: continue with off-chain channel even if on-chain open fails (e.g., insufficient admin funds)
        txHash = null;
      }
    }
    return res.status(200).json({
      channelId: opened.channelId,
      minTipWei: env.yellow.minTipWei,
      minDepositWei: env.yellow.minChannelDepositWei,
      chainId: env.yellow.chainId,
      contract: env.yellow.channelContract,
      reused: opened.reused,
      txHash,
    });
  } catch (e: any) {
    return res.status(500).json({ message: e.message || 'failed' });
  }
});

// GET /channels/:id
router.get('/:id', async (req, res) => {
  try {
    await connectMongo();
    const ch = await ChannelModel.findOne({ channelId: req.params.id }).lean();
    if (!ch) return res.status(404).json({ message: 'not found' });
    return res.json(ch);
  } catch (e: any) { return res.status(500).json({ message: e.message }); }
});

// POST /channels/:id/tip { newSpentWei, nonce, signature, message }
router.post('/:id/tip', tipRateLimiter, async (req, res) => {
  try {
    const user = (req as any).user;
    const { newSpentWei, nonce, signature, message, viewer: viewerOverride } = req.body as { newSpentWei: string; nonce: number; signature: string; message?: string; viewer?: string };
    if (!newSpentWei || typeof nonce !== 'number' || !signature) return res.status(400).json({ message: 'missing fields' });
    const headerViewer = String(req.headers['x-viewer-address'] || '').toLowerCase();
    const viewer = (viewerOverride?.toLowerCase() && viewerOverride.startsWith('0x')
      ? viewerOverride.toLowerCase()
      : (headerViewer.startsWith('0x') ? headerViewer : (user.walletAddress||user.address||'')).toLowerCase());
    const result = await verifyAndApplyTip({ channelId: req.params.id, newSpentWei, nonce, signature, viewer, message });
    // Broadcast superchat event (cumulative tip state)
    const ch: any = await ChannelModel.findOne({ channelId: req.params.id }).lean();
    if (ch?.streamId) {
  const tipAmountEth = Number(ethers.formatEther(BigInt(result.tipWei)));
  const cumulativeEth = Number(ethers.formatEther(BigInt(result.newSpentWei)));
      let tier = 0;
      if (cumulativeEth >= 0.05) tier = 3; else if (cumulativeEth >= 0.01) tier = 2; else if (cumulativeEth >= 0.001) tier = 1;
      emitToStream(String(ch.streamId), 'superchat', {
        channelId: ch.channelId,
        streamId: ch.streamId,
        viewerAddress: ch.viewerAddress,
        tipWei: result.tipWei.toString(),
        cumulativeWei: result.newSpentWei.toString(),
        tipAmountEth,
        cumulativeEth,
        tier,
        message: message || '',
        nonce: result.nonce,
      });
    }
    return res.json({ ok: true, ...result });
  } catch (e: any) { return res.status(400).json({ message: e.message || 'failed' }); }
});

// POST /channels/:id/close
router.post('/:id/close', async (req, res) => {
  try {
  const out = await closeChannelCooperative(req.params.id);
  // Also close on-chain channel settlement with spentWei
  const ch: any = await ChannelModel.findOne({ channelId: req.params.id }).lean();
  const spent = BigInt(ch?.spentWei || '0');
  try {
    const onchain = await yellowService.closeChannel(req.params.id, spent);
    return res.json({ ...out, settlementTx: onchain.txHash });
  } catch (e: any) {
    // Non-fatal in non-production environments: return cooperative close result even if on-chain close fails
    if (process.env.NODE_ENV !== 'production') {
      return res.json({ ...out, settlementTx: null, onchainError: e?.message || String(e) });
    }
    // In production, propagate error
    throw e;
  }
  } catch (e: any) { return res.status(400).json({ message: e.message }); }
});

// POST /channels/:id/adjudicate { state, signature }
router.post('/:id/adjudicate', async (req, res) => {
  try {
    const user = (req as any).user;
    const { state, signature } = req.body as any;
    if (!state || !signature) return res.status(400).json({ message: 'missing fields' });
    if (String(state.channelId).toLowerCase() !== String(req.params.id).toLowerCase()) return res.status(400).json({ message: 'channelId mismatch' });
    const txHash = await yellowService.adjudicate(state, signature);
    return res.json({ ok: true, txHash });
  } catch (e: any) { return res.status(400).json({ message: e.message || 'failed' }); }
});

// GET /channels/stream/:streamId/summary -> aggregate spentWei for OPEN + CLOSED channels (current state revenue)
router.get('/stream/:streamId/summary', async (req, res) => {
  try {
    await connectMongo();
    const streamId = req.params.streamId;
    const channels = await ChannelModel.find({ streamId }).lean();
    let total = 0n;
    for (const ch of channels) total += BigInt((ch as any).spentWei || '0');
    return res.json({ streamId, totalSpentWei: total.toString(), totalSpentEth: (Number(total)/1e18).toFixed(6), channelCount: channels.length });
  } catch (e: any) {
    return res.status(500).json({ message: e.message }); }
});

export default router;
