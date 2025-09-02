"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const monetization_controller_1 = require("./monetization.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const prisma_1 = require("../../lib/prisma");
const socket_1 = require("../../lib/socket");
// Use dynamic import for json2csv to avoid type resolution issues
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authMiddleware);
router.get('/summary', monetization_controller_1.getSummary);
router.get('/donations', monetization_controller_1.getDonations);
router.get('/nfts', monetization_controller_1.getNfts);
router.get('/payouts', monetization_controller_1.getPayouts);
// Create a donation (generic provider or off-platform tip). Body: { amount, currency, streamId?, message? }
router.post('/donations', async (req, res) => {
    try {
        const userId = req.user?.id;
        const { amount, currency, streamId, message } = req.body;
        if (!amount || amount <= 0)
            return res.status(400).json({ message: 'amount > 0 required' });
        const tx = await prisma_1.prisma.transaction.create({
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
        if (streamId)
            (0, socket_1.emitToStream)(streamId, 'donation', { amount, currency: (currency || 'USD').toUpperCase(), from: userId, message: message || '' });
        return res.status(201).json({ ok: true, id: tx.id });
    }
    catch (e) {
        return res.status(500).json({ message: e?.message || 'failed' });
    }
});
// Donations CSV export for a streamer (auth required). Query: streamerId? defaults to current user
router.get('/donations.csv', async (req, res) => {
    try {
        const streamerId = req.query.streamerId || req.user?.id;
        const from = req.query.from ? new Date(String(req.query.from)) : null;
        const to = req.query.to ? new Date(String(req.query.to)) : null;
        const streamIdFilter = req.query.streamId || null;
        // Fetch donations to any streams created by this streamer or to the user directly
        const streams = await prisma_1.prisma.stream.findMany({ where: { streamerId }, select: { id: true, title: true } });
        const streamIds = streams.map(s => s.id);
        const where = { type: 'DONATION', OR: [{ streamId: { in: streamIds } }, { userId: streamerId }] };
        if (from || to)
            where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
        if (streamIdFilter)
            where.streamId = streamIdFilter;
        const donations = await prisma_1.prisma.transaction.findMany({ where, orderBy: { createdAt: 'desc' } });
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
        const parser = new json2csv.Parser({ fields: ['id', 'amount', 'currency', 'status', 'provider', 'streamId', 'userId', 'createdAt'] });
        const csv = parser.parse(rows);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="donations.csv"');
        return res.status(200).send(csv);
    }
    catch (e) {
        return res.status(500).json({ message: e?.message || 'export failed' });
    }
});
// ----- Payout Requests -----
// POST /monetization/payouts -> create payout request
router.post('/payouts', async (req, res) => {
    try {
        const streamerId = req.user?.id;
        const { amount, currency, note } = req.body;
        if (!amount || amount <= 0)
            return res.status(400).json({ message: 'amount > 0 required' });
        const prismaAny = prisma_1.prisma;
        const payout = await prismaAny.payoutRequest.create({ data: { streamerId, amount, currency: (currency || 'USD').toUpperCase(), note } });
        return res.status(201).json(payout);
    }
    catch (e) {
        return res.status(500).json({ message: e?.message || 'failed' });
    }
});
// GET /monetization/payouts -> list payout requests for current user
router.get('/payouts', async (req, res) => {
    try {
        const streamerId = req.user?.id;
        const prismaAny = prisma_1.prisma;
        const items = await prismaAny.payoutRequest.findMany({ where: { streamerId }, orderBy: { createdAt: 'desc' } });
        return res.status(200).json(items);
    }
    catch (e) {
        return res.status(500).json({ message: e?.message || 'failed' });
    }
});
// PATCH /monetization/payouts/:id/status -> admin updates status
router.patch('/payouts/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const prismaAny = prisma_1.prisma;
        const updated = await prismaAny.payoutRequest.update({ where: { id }, data: { status } });
        return res.status(200).json(updated);
    }
    catch (e) {
        return res.status(500).json({ message: e?.message || 'failed' });
    }
});
exports.default = router;
//# sourceMappingURL=monetization.routes.js.map