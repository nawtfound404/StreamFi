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
const router = (0, express_1.Router)();
const postLimiter = (0, express_rate_limit_1.default)({ windowMs: 10_000, max: 10 });
router.get('/:streamId/messages', async (req, res) => {
    await (0, mongo_1.connectMongo)();
    const sid = req.params.streamId;
    const streamId = mongoose_1.default.Types.ObjectId.isValid(sid) ? new mongoose_1.default.Types.ObjectId(sid) : undefined;
    const items = await mongo_1.ChatMessageModel.find(streamId ? { streamId } : { streamId: sid })
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
    const streamId = mongoose_1.default.Types.ObjectId.isValid(sid) ? new mongoose_1.default.Types.ObjectId(sid) : sid;
    const userId = mongoose_1.default.Types.ObjectId.isValid(uid) ? new mongoose_1.default.Types.ObjectId(uid) : uid;
    const msg = await mongo_1.ChatMessageModel.create({ streamId, userId, text: text.slice(0, 500) });
    res.status(201).json({ item: msg });
});
exports.default = router;
//# sourceMappingURL=chat.routes.js.map