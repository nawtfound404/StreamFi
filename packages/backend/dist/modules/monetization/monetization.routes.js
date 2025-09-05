"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const monetization_controller_1 = require("./monetization.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const socket_1 = require("../../lib/socket");
const mongo_1 = require("../../lib/mongo");
const rbac_middleware_1 = require("../../middlewares/rbac.middleware");
const mongoose_1 = __importDefault(require("mongoose"));
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
        await (0, mongo_1.connectMongo)();
        const userId = req.user?.id;
        const { amount, currency, streamId, message } = req.body;
        if (!amount || amount <= 0)
            return res.status(400).json({ message: 'amount > 0 required' });
        const tx = await mongo_1.TransactionModel.create({
            amount,
            currency: (currency || 'USD').toUpperCase(),
            type: 'DONATION',
            status: 'COMPLETED',
            provider: 'DIRECT',
            userId: mongoose_1.default.Types.ObjectId.isValid(userId) ? new mongoose_1.default.Types.ObjectId(userId) : userId,
            streamId: streamId ? (mongoose_1.default.Types.ObjectId.isValid(streamId) ? new mongoose_1.default.Types.ObjectId(streamId) : streamId) : undefined,
            metadata: message ? { message } : undefined,
        });
        // Emit socket alert to stream room
        if (streamId)
            (0, socket_1.emitToStream)(streamId, 'donation', { amount, currency: (currency || 'USD').toUpperCase(), from: userId, message: message || '' });
        return res.status(201).json({ ok: true, id: String(tx._id) });
    }
    catch (e) {
        return res.status(500).json({ message: e?.message || 'failed' });
    }
});
// Wallet token flow: deposit into per-stream balance (off-chain accounting)
router.post('/deposit', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        await (0, mongo_1.connectMongo)();
        const userId = req.user?.id;
        const { streamId, amount, token } = req.body;
        if (!streamId || !amount || amount <= 0)
            return res.status(400).json({ message: 'streamId and amount > 0 required' });
        const update = await mongo_1.BalanceModel.findOneAndUpdate({ userId, streamId }, { $inc: { deposited: amount }, $setOnInsert: { token: token || 'NATIVE' } }, { new: true, upsert: true }).lean();
        return res.status(200).json(update);
    }
    catch (e) {
        return res.status(500).json({ message: e?.message || 'failed' });
    }
});
// Settle remaining balance at end of stream (returns remaining for client to refund on-chain)
router.post('/settle', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        await (0, mongo_1.connectMongo)();
        const userId = req.user?.id;
        const { streamId } = req.body;
        if (!streamId)
            return res.status(400).json({ message: 'streamId required' });
        const bal = await mongo_1.BalanceModel.findOne({ userId, streamId }).lean();
        if (!bal)
            return res.status(200).json({ remaining: 0 });
        const remaining = Math.max(0, Number(bal.deposited || 0) - Number(bal.spent || 0));
        // Mark as fully spent to prevent reuse; client should handle on-chain refund
        await mongo_1.BalanceModel.updateOne({ _id: bal._id }, { $set: { spent: Number(bal.deposited || 0) } });
        return res.status(200).json({ remaining, token: String(bal.token || 'NATIVE') });
    }
    catch (e) {
        return res.status(500).json({ message: e?.message || 'failed' });
    }
});
// Donations CSV export for a streamer (auth required). Query: streamerId? defaults to current user
router.get('/donations.csv', rbac_middleware_1.requireStreamer, async (req, res) => {
    try {
        await (0, mongo_1.connectMongo)();
        const streamerId = req.query.streamerId || req.user?.id;
        const from = req.query.from ? new Date(String(req.query.from)) : null;
        const to = req.query.to ? new Date(String(req.query.to)) : null;
        const streamIdFilter = req.query.streamId || null;
        // Fetch donations to any streams created by this streamer or to the user directly
        const sid = mongoose_1.default.Types.ObjectId.isValid(streamerId) ? new mongoose_1.default.Types.ObjectId(streamerId) : streamerId;
        const streams = await mongo_1.StreamModel.find({ streamerId: sid }).select({ _id: 1, title: 1 }).lean();
        const streamIds = streams.map((s) => s._id);
        const or = [{ userId: sid }];
        if (streamIds.length)
            or.unshift({ streamId: { $in: streamIds } });
        const where = { type: 'DONATION', $or: or };
        if (from || to)
            where.createdAt = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
        if (streamIdFilter)
            where.streamId = mongoose_1.default.Types.ObjectId.isValid(streamIdFilter) ? new mongoose_1.default.Types.ObjectId(streamIdFilter) : streamIdFilter;
        const donations = await mongo_1.TransactionModel.find(where).sort({ createdAt: -1 }).lean();
        const rows = donations.map((d) => ({
            id: String(d._id),
            amount: d.amount,
            currency: d.currency,
            status: d.status,
            provider: d.provider,
            streamId: d.streamId ? String(d.streamId) : '',
            userId: String(d.userId),
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
router.post('/payouts', rbac_middleware_1.requireStreamer, async (req, res) => {
    try {
        await (0, mongo_1.connectMongo)();
        const streamerId = req.user?.id;
        const { amount, currency, note } = req.body;
        if (!amount || amount <= 0)
            return res.status(400).json({ message: 'amount > 0 required' });
        const payload = {
            streamerId: mongoose_1.default.Types.ObjectId.isValid(streamerId) ? new mongoose_1.default.Types.ObjectId(streamerId) : streamerId,
            amount,
            currency: (currency || 'USD').toUpperCase(),
            note,
        };
        const payout = await mongo_1.PayoutRequestModel.create(payload);
        return res.status(201).json(payout.toObject());
    }
    catch (e) {
        return res.status(500).json({ message: e?.message || 'failed' });
    }
});
// GET /monetization/payouts -> list payout requests for current user
router.get('/payouts', rbac_middleware_1.requireStreamer, async (req, res) => {
    try {
        await (0, mongo_1.connectMongo)();
        const streamerId = req.user?.id;
        const sid = mongoose_1.default.Types.ObjectId.isValid(streamerId) ? new mongoose_1.default.Types.ObjectId(streamerId) : streamerId;
        const items = await mongo_1.PayoutRequestModel.find({ streamerId: sid }).sort({ createdAt: -1 }).lean();
        return res.status(200).json(items);
    }
    catch (e) {
        return res.status(500).json({ message: e?.message || 'failed' });
    }
});
// PATCH /monetization/payouts/:id/status -> admin updates status
router.patch('/payouts/:id/status', rbac_middleware_1.requireAdmin, async (req, res) => {
    try {
        await (0, mongo_1.connectMongo)();
        const { id } = req.params;
        const { status } = req.body;
        const _id = mongoose_1.default.Types.ObjectId.isValid(id) ? new mongoose_1.default.Types.ObjectId(id) : id;
        await mongo_1.PayoutRequestModel.updateOne({ _id }, { $set: { status } });
        const updated = await mongo_1.PayoutRequestModel.findById(_id).lean();
        return res.status(200).json(updated);
    }
    catch (e) {
        return res.status(500).json({ message: e?.message || 'failed' });
    }
});
exports.default = router;
//# sourceMappingURL=monetization.routes.js.map