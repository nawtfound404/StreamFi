import { Router } from 'express';
import { getSummary, getDonations, getNfts, getPayouts } from './monetization.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { prisma } from '../../lib/prisma';
import { emitToStream } from '../../lib/socket';
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
		const userId = (req as any).user?.id as string;
		const { amount, currency, streamId, message } = req.body as { amount: number; currency?: string; streamId?: string; message?: string };
		if (!amount || amount <= 0) return res.status(400).json({ message: 'amount > 0 required' });
		const tx = await prisma.transaction.create({
			data: {
				amount,
				currency: (currency || 'USD').toUpperCase(),
				type: 'DONATION',
				status: 'COMPLETED',
				provider: 'DIRECT',
				userId,
				streamId: streamId || null,
				metadata: message ? { message } : undefined,
			},
		});
		// Emit socket alert to stream room
		if (streamId) emitToStream(streamId, 'donation', { amount, currency: (currency || 'USD').toUpperCase(), from: userId, message: message || '' });
		return res.status(201).json({ ok: true, id: tx.id });
	} catch (e: any) {
		return res.status(500).json({ message: e?.message || 'failed' });
	}
});

// Donations CSV export for a streamer (auth required). Query: streamerId? defaults to current user
router.get('/donations.csv', async (req, res) => {
	try {
		const streamerId = (req.query.streamerId as string) || (req as any).user?.id;
	const from = req.query.from ? new Date(String(req.query.from)) : null;
	const to = req.query.to ? new Date(String(req.query.to)) : null;
	const streamIdFilter = (req.query.streamId as string) || null;
		// Fetch donations to any streams created by this streamer or to the user directly
	const streams = await prisma.stream.findMany({ where: { streamerId }, select: { id: true, title: true } });
		const streamIds = streams.map(s => s.id);
	const where: any = { type: 'DONATION', OR: [{ streamId: { in: streamIds } }, { userId: streamerId }] };
	if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
	if (streamIdFilter) where.streamId = streamIdFilter;
	const donations = await prisma.transaction.findMany({ where, orderBy: { createdAt: 'desc' } });
		const rows = donations.map((d) => ({
			id: d.id,
			amount: d.amount,
			currency: d.currency,
			status: d.status,
			provider: d.provider,
			streamId: d.streamId || '',
			userId: d.userId,
			createdAt: d.createdAt.toISOString(),
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
	router.post('/payouts', async (req, res) => {
		try {
			const streamerId = (req as any).user?.id as string;
			const { amount, currency, note } = req.body as { amount: number; currency?: string; note?: string };
			if (!amount || amount <= 0) return res.status(400).json({ message: 'amount > 0 required' });
		const prismaAny: any = prisma as any;
		const payout = await prismaAny.payoutRequest.create({ data: { streamerId, amount, currency: (currency||'USD').toUpperCase(), note } });
			return res.status(201).json(payout);
		} catch (e: any) {
			return res.status(500).json({ message: e?.message || 'failed' });
		}
	});

	// GET /monetization/payouts -> list payout requests for current user
	router.get('/payouts', async (req, res) => {
		try {
			const streamerId = (req as any).user?.id as string;
		const prismaAny: any = prisma as any;
		const items = await prismaAny.payoutRequest.findMany({ where: { streamerId }, orderBy: { createdAt: 'desc' } });
			return res.status(200).json(items);
		} catch (e: any) {
			return res.status(500).json({ message: e?.message || 'failed' });
		}
	});

	// PATCH /monetization/payouts/:id/status -> admin updates status
	router.patch('/payouts/:id/status', async (req, res) => {
		try {
			const { id } = req.params;
			const { status } = req.body as { status: 'PENDING'|'APPROVED'|'PAID'|'REJECTED' };
		const prismaAny: any = prisma as any;
		const updated = await prismaAny.payoutRequest.update({ where: { id }, data: { status } });
			return res.status(200).json(updated);
		} catch (e: any) {
			return res.status(500).json({ message: e?.message || 'failed' });
		}
	});

export default router;