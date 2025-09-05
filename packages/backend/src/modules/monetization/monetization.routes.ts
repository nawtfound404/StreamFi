import { Router } from 'express';
import { getSummary, getDonations, getNfts, getPayouts } from './monetization.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { emitToStream } from '../../lib/socket';
import { TransactionModel, StreamModel, PayoutRequestModel, BalanceModel, connectMongo } from '../../lib/mongo';
import { requireAdmin, requireStreamer } from '../../middlewares/rbac.middleware';
import mongoose from 'mongoose';
// Use dynamic import for json2csv to avoid type resolution issues
const router = Router();
router.use(authMiddleware);
router.get('/summary', getSummary);
router.get('/donations', getDonations);
router.get('/nfts', getNfts);
router.get('/payouts', getPayouts);

// Create a donation (generic provider or off-platform tip). Body: { amount, currency, streamId?, message? }
router.post('/donations', async (req, res) => {
	try {
		await connectMongo();
		const userId = (req as any).user?.id as string;
		const { amount, currency, streamId, message } = req.body as { amount: number; currency?: string; streamId?: string; message?: string };
		if (!amount || amount <= 0) return res.status(400).json({ message: 'amount > 0 required' });
		const tx = await TransactionModel.create({
			amount,
			currency: (currency || 'USD').toUpperCase(),
			type: 'DONATION',
			status: 'COMPLETED',
			provider: 'DIRECT',
			userId: mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId,
			streamId: streamId ? (mongoose.Types.ObjectId.isValid(streamId) ? new mongoose.Types.ObjectId(streamId) : streamId) : undefined,
			metadata: message ? { message } : undefined,
		});
		// Emit socket alert to stream room
		if (streamId) emitToStream(streamId, 'donation', { amount, currency: (currency || 'USD').toUpperCase(), from: userId, message: message || '' });
		return res.status(201).json({ ok: true, id: String((tx as any)._id) });
	} catch (e: any) {
		return res.status(500).json({ message: e?.message || 'failed' });
	}
});

// Wallet token flow: deposit into per-stream balance (off-chain accounting)
router.post('/deposit', authMiddleware, async (req, res) => {
	try {
		await connectMongo();
		const userId = (req as any).user?.id as string;
		const { streamId, amount, token } = req.body as { streamId: string; amount: number; token?: string };
		if (!streamId || !amount || amount <= 0) return res.status(400).json({ message: 'streamId and amount > 0 required' });
		const update = await BalanceModel.findOneAndUpdate(
			{ userId, streamId },
			{ $inc: { deposited: amount }, $setOnInsert: { token: token || 'NATIVE' } },
			{ new: true, upsert: true }
		).lean();
		return res.status(200).json(update);
	} catch (e: any) {
		return res.status(500).json({ message: e?.message || 'failed' });
	}
});

// Settle remaining balance at end of stream (returns remaining for client to refund on-chain)
router.post('/settle', authMiddleware, async (req, res) => {
	try {
		await connectMongo();
		const userId = (req as any).user?.id as string;
		const { streamId } = req.body as { streamId: string };
		if (!streamId) return res.status(400).json({ message: 'streamId required' });
		const bal: any = await BalanceModel.findOne({ userId, streamId }).lean();
		if (!bal) return res.status(200).json({ remaining: 0 });
		const remaining = Math.max(0, Number(bal.deposited || 0) - Number(bal.spent || 0));
		// Mark as fully spent to prevent reuse; client should handle on-chain refund
		await BalanceModel.updateOne({ _id: (bal as any)._id }, { $set: { spent: Number(bal.deposited || 0) } });
		return res.status(200).json({ remaining, token: String(bal.token || 'NATIVE') });
	} catch (e: any) {
		return res.status(500).json({ message: e?.message || 'failed' });
	}
});

// Donations CSV export for a streamer (auth required). Query: streamerId? defaults to current user
router.get('/donations.csv', requireStreamer, async (req, res) => {
	try {
		await connectMongo();
		const streamerId = (req.query.streamerId as string) || (req as any).user?.id;
	const from = req.query.from ? new Date(String(req.query.from)) : null;
	const to = req.query.to ? new Date(String(req.query.to)) : null;
	const streamIdFilter = (req.query.streamId as string) || null;
		// Fetch donations to any streams created by this streamer or to the user directly
		const sid = mongoose.Types.ObjectId.isValid(streamerId) ? new mongoose.Types.ObjectId(streamerId) : streamerId;
		const streams = await StreamModel.find({ streamerId: sid }).select({ _id: 1, title: 1 }).lean();
		const streamIds = streams.map((s) => s._id);
		const or: any[] = [{ userId: sid }];
		if (streamIds.length) or.unshift({ streamId: { $in: streamIds } });
		const where: any = { type: 'DONATION', $or: or };
		if (from || to) where.createdAt = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
		if (streamIdFilter) where.streamId = mongoose.Types.ObjectId.isValid(streamIdFilter) ? new mongoose.Types.ObjectId(streamIdFilter) : streamIdFilter;
		const donations = await TransactionModel.find(where).sort({ createdAt: -1 }).lean();
		const rows = donations.map((d) => ({
			id: String((d as any)._id),
			amount: d.amount,
			currency: d.currency,
			status: d.status,
			provider: d.provider,
			streamId: d.streamId ? String(d.streamId) : '',
			userId: String(d.userId),
			createdAt: (d.createdAt as Date).toISOString(),
		}));
		const json2csv = await import('json2csv');
		const parser = new (json2csv as any).Parser({ fields: ['id','amount','currency','status','provider','streamId','userId','createdAt'] });
		const csv = parser.parse(rows);
		res.setHeader('Content-Type', 'text/csv');
		res.setHeader('Content-Disposition', 'attachment; filename="donations.csv"');
		return res.status(200).send(csv);
	} catch (e: any) {
		return res.status(500).json({ message: e?.message || 'export failed' });
	}
});

	// ----- Payout Requests -----
	// POST /monetization/payouts -> create payout request
	router.post('/payouts', requireStreamer, async (req, res) => {
		try {
			await connectMongo();
			const streamerId = (req as any).user?.id as string;
			const { amount, currency, note } = req.body as { amount: number; currency?: string; note?: string };
			if (!amount || amount <= 0) return res.status(400).json({ message: 'amount > 0 required' });
			const payload: any = {
				streamerId: mongoose.Types.ObjectId.isValid(streamerId) ? new mongoose.Types.ObjectId(streamerId) : streamerId,
				amount,
				currency: (currency||'USD').toUpperCase(),
				note,
			};
			const payout = await PayoutRequestModel.create(payload);
			return res.status(201).json(payout.toObject());
		} catch (e: any) {
			return res.status(500).json({ message: e?.message || 'failed' });
		}
	});

	// GET /monetization/payouts -> list payout requests for current user
	router.get('/payouts', requireStreamer, async (req, res) => {
		try {
			await connectMongo();
			const streamerId = (req as any).user?.id as string;
			const sid = mongoose.Types.ObjectId.isValid(streamerId) ? new mongoose.Types.ObjectId(streamerId) : streamerId;
			const items = await PayoutRequestModel.find({ streamerId: sid }).sort({ createdAt: -1 }).lean();
			return res.status(200).json(items);
		} catch (e: any) {
			return res.status(500).json({ message: e?.message || 'failed' });
		}
	});

	// PATCH /monetization/payouts/:id/status -> admin updates status
	router.patch('/payouts/:id/status', requireAdmin, async (req, res) => {
		try {
			await connectMongo();
			const { id } = req.params;
			const { status } = req.body as { status: 'PENDING'|'APPROVED'|'PAID'|'REJECTED' };
			const _id = mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id as any;
			await PayoutRequestModel.updateOne({ _id }, { $set: { status } });
			const updated = await PayoutRequestModel.findById(_id).lean();
			return res.status(200).json(updated);
		} catch (e: any) {
			return res.status(500).json({ message: e?.message || 'failed' });
		}
	});

export default router;