"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mongo_1 = require("../../lib/mongo");
const mongoose_1 = __importDefault(require("mongoose"));
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Current user profile (401 if unauthenticated)
router.get('/me', auth_middleware_1.authMiddleware, async (req, res) => {
    await (0, mongo_1.connectMongo)();
    const me = await mongo_1.UserModel.findById(req.user.id).select({ email: 1, role: 1, username: 1 }).lean();
    if (!me)
        return res.status(404).json({ message: 'User not found' });
    return res.json({ id: req.user.id, email: me.email || null, role: me.role, username: me.username || null });
});
router.post('/role', auth_middleware_1.authMiddleware, async (req, res) => {
    const { role } = req.body;
    if (!role)
        return res.status(400).json({ message: 'role required' });
    await (0, mongo_1.connectMongo)();
    await mongo_1.UserModel.updateOne({ _id: req.user.id }, { $set: { role } });
    return res.json({ ok: true, role });
});
router.post('/username', auth_middleware_1.authMiddleware, async (req, res) => {
    const { username } = req.body;
    if (!username || !/^[a-z0-9_\.\-]{3,20}$/i.test(username))
        return res.status(400).json({ message: 'invalid username' });
    await (0, mongo_1.connectMongo)();
    const exists = await mongo_1.UserModel.findOne({ username: new RegExp(`^${username}$`, 'i') }).select({ _id: 1 }).lean();
    if (exists && exists._id && String(exists._id) !== req.user.id)
        return res.status(409).json({ message: 'username taken' });
    await mongo_1.UserModel.updateOne({ _id: req.user.id }, { $set: { username } });
    return res.json({ ok: true, username });
});
router.get('/streams/live', async (_req, res) => {
    await (0, mongo_1.connectMongo)();
    const items = await mongo_1.StreamModel.find({ status: 'LIVE' }).select({ title: 1, streamerId: 1, viewers: 1, createdAt: 1 }).lean();
    return res.json({ items });
});
router.post('/streams/:id/join', auth_middleware_1.authMiddleware, async (req, res) => {
    await (0, mongo_1.connectMongo)();
    const { id } = req.params;
    const stream = mongoose_1.default.Types.ObjectId.isValid(id)
        ? await mongo_1.StreamModel.findById(id).select({ _id: 1 }).lean()
        : await mongo_1.StreamModel.findOne({ streamKey: id }).select({ _id: 1 }).lean();
    if (!stream)
        return res.status(404).json({ ok: false, message: 'Stream not found' });
    await mongo_1.StreamModel.updateOne({ _id: stream._id }, { $inc: { viewers: 1 } });
    return res.json({ ok: true });
});
router.post('/streams/:id/leave', auth_middleware_1.authMiddleware, async (req, res) => {
    await (0, mongo_1.connectMongo)();
    const { id } = req.params;
    const stream = mongoose_1.default.Types.ObjectId.isValid(id)
        ? await mongo_1.StreamModel.findById(id).select({ _id: 1 }).lean()
        : await mongo_1.StreamModel.findOne({ streamKey: id }).select({ _id: 1 }).lean();
    if (!stream)
        return res.status(404).json({ ok: false, message: 'Stream not found' });
    await mongo_1.StreamModel.updateOne({ _id: stream._id, viewers: { $gt: 0 } }, { $inc: { viewers: -1 } });
    return res.json({ ok: true });
});
// Basic moderation shortcuts
router.post('/mute', auth_middleware_1.authMiddleware, async (req, res) => {
    const { userId } = req.body;
    if (!userId)
        return res.status(400).json({ message: 'userId required' });
    await (0, mongo_1.connectMongo)();
    await mongo_1.MuteModel.updateOne({ userId }, { $set: {} }, { upsert: true });
    return res.json({ ok: true });
});
router.post('/unmute', auth_middleware_1.authMiddleware, async (req, res) => {
    const { userId } = req.body;
    if (!userId)
        return res.status(400).json({ message: 'userId required' });
    await (0, mongo_1.connectMongo)();
    await mongo_1.MuteModel.deleteOne({ userId });
    return res.json({ ok: true });
});
exports.default = router;
//# sourceMappingURL=user.routes.js.map