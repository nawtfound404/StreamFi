"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const rbac_middleware_1 = require("../../middlewares/rbac.middleware");
const mongo_1 = require("../../lib/mongo");
const mongoose_1 = __importDefault(require("mongoose"));
const router = (0, express_1.Router)();
// Public: list reactions by stream id (viewer use-case)
router.get('/by-stream/:id', async (req, res) => {
    await (0, mongo_1.connectMongo)();
    const { id } = req.params;
    const sid = mongoose_1.default.Types.ObjectId.isValid(id) ? new mongoose_1.default.Types.ObjectId(id) : id;
    const stream = await mongo_1.StreamModel.findById(sid).lean();
    if (!stream)
        return res.status(404).json({ message: 'stream not found' });
    const items = await mongo_1.ReactionModel.find({ streamerId: stream.streamerId }).sort({ createdAt: 1 }).lean();
    return res.status(200).json(items.map(i => ({ key: i.key, label: i.label, priceInPaise: i.priceInPaise })));
});
// List reactions for current streamer
router.get('/', auth_middleware_1.authMiddleware, rbac_middleware_1.requireStreamer, async (req, res) => {
    await (0, mongo_1.connectMongo)();
    const streamerId = req.user?.id;
    const sid = mongoose_1.default.Types.ObjectId.isValid(streamerId) ? new mongoose_1.default.Types.ObjectId(streamerId) : streamerId;
    const items = await mongo_1.ReactionModel.find({ streamerId: sid }).sort({ createdAt: 1 }).lean();
    return res.status(200).json(items);
});
// Upsert reaction (create or update by key)
router.post('/', auth_middleware_1.authMiddleware, rbac_middleware_1.requireStreamer, async (req, res) => {
    await (0, mongo_1.connectMongo)();
    const streamerId = req.user?.id;
    const { key, label } = req.body;
    const priceInPaise = Math.max(0, Number(req.body.priceInPaise || 0));
    if (!key || !/^[a-z0-9_-]{1,32}$/.test(key))
        return res.status(400).json({ message: 'invalid key' });
    if (!label || label.length > 64)
        return res.status(400).json({ message: 'invalid label' });
    const sid = mongoose_1.default.Types.ObjectId.isValid(streamerId) ? new mongoose_1.default.Types.ObjectId(streamerId) : streamerId;
    const doc = await mongo_1.ReactionModel.findOneAndUpdate({ streamerId: sid, key }, { $set: { label, priceInPaise } }, { new: true, upsert: true, setDefaultsOnInsert: true }).lean();
    return res.status(200).json(doc);
});
// Delete reaction by key
router.delete('/:key', auth_middleware_1.authMiddleware, rbac_middleware_1.requireStreamer, async (req, res) => {
    await (0, mongo_1.connectMongo)();
    const streamerId = req.user?.id;
    const { key } = req.params;
    if (!key)
        return res.status(400).json({ message: 'key required' });
    const sid = mongoose_1.default.Types.ObjectId.isValid(streamerId) ? new mongoose_1.default.Types.ObjectId(streamerId) : streamerId;
    await mongo_1.ReactionModel.deleteOne({ streamerId: sid, key });
    return res.status(200).json({ ok: true });
});
exports.default = router;
//# sourceMappingURL=reactions.routes.js.map