"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const mongo_1 = require("../../lib/mongo");
const mongoose_1 = __importDefault(require("mongoose"));
const socket_1 = require("../../lib/socket");
const router = (0, express_1.Router)();
const postLimiter = (0, express_rate_limit_1.default)({ windowMs: 10_000, max: 10 });
router.get('/:streamId/messages', async (req, res) => {
    await (0, mongo_1.connectMongo)();
    const sid = req.params.streamId;
    const stream = mongoose_1.default.Types.ObjectId.isValid(sid)
        ? await mongo_1.StreamModel.findById(sid).select({ _id: 1 }).lean()
        : await mongo_1.StreamModel.findOne({ streamKey: sid }).select({ _id: 1 }).lean();
    if (!stream)
        return res.status(404).json({ items: [] });
    const streamId = new mongoose_1.default.Types.ObjectId(String(stream._id));
    const items = await mongo_1.ChatMessageModel.find({ streamId })
        .sort({ createdAt: 1 })
        .limit(200)
        .lean();
    res.json({ items });
});
router.post('/:streamId/messages', auth_middleware_1.authMiddleware, postLimiter, async (req, res) => {
    await (0, mongo_1.connectMongo)();
    // Reject if muted
    const uid = req.user.id;
    const isMuted = await mongo_1.MuteModel.findOne({ userId: uid }).lean();
    if (isMuted)
        return res.status(403).json({ message: 'Muted' });
    const { text } = req.body;
    if (!text?.trim())
        return res.status(400).json({ message: 'Text required' });
    const sid = req.params.streamId;
    // Allow using either the Mongo _id or the public streamKey
    const stream = mongoose_1.default.Types.ObjectId.isValid(sid)
        ? await mongo_1.StreamModel.findById(sid).select({ _id: 1, streamKey: 1 }).lean()
        : await mongo_1.StreamModel.findOne({ streamKey: sid }).select({ _id: 1, streamKey: 1 }).lean();
    if (!stream)
        return res.status(404).json({ message: 'Stream not found' });
    const streamId = new mongoose_1.default.Types.ObjectId(String(stream._id));
    const userId = new mongoose_1.default.Types.ObjectId(String(uid));
    const msg = await mongo_1.ChatMessageModel.create({ streamId, userId, text: text.trim().slice(0, 500) });
    // Broadcast to both rooms (id and key) for connected clients
    (0, socket_1.emitToStreamRooms)({ id: String(stream._id), key: stream.streamKey }, 'chat_message', {
        id: String(msg._id),
        user: String(uid),
        text: msg.text,
        at: new Date(msg.createdAt).getTime(),
    });
    res.status(201).json({ item: msg });
});
exports.default = router;
//# sourceMappingURL=chat.routes.js.map