"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mongo_1 = require("../../lib/mongo");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Simple role-check middleware for admin-only routes
function requireAdmin(req, res, next) {
    if (req.user?.role === 'ADMIN')
        return next();
    return res.status(403).json({ message: 'Forbidden' });
}
router.post('/mute', auth_middleware_1.authMiddleware, requireAdmin, async (req, res) => {
    const { userId, reason } = req.body;
    if (!userId)
        return res.status(400).json({ message: 'userId required' });
    await (0, mongo_1.connectMongo)();
    await mongo_1.MuteModel.updateOne({ userId }, { $set: { reason } }, { upsert: true });
    return res.status(200).json({ ok: true });
});
router.post('/ban', auth_middleware_1.authMiddleware, requireAdmin, async (req, res) => {
    const { userId, reason } = req.body;
    if (!userId)
        return res.status(400).json({ message: 'userId required' });
    await (0, mongo_1.connectMongo)();
    await mongo_1.UserModel.updateOne({ _id: userId }, { $set: { banned: true, bannedAt: new Date(), banReason: reason } });
    return res.status(200).json({ ok: true });
});
router.post('/unban', auth_middleware_1.authMiddleware, requireAdmin, async (req, res) => {
    const { userId } = req.body;
    if (!userId)
        return res.status(400).json({ message: 'userId required' });
    await (0, mongo_1.connectMongo)();
    await mongo_1.UserModel.updateOne({ _id: userId }, { $set: { banned: false, bannedAt: null, banReason: null } });
    return res.status(200).json({ ok: true });
});
router.post('/unmute', auth_middleware_1.authMiddleware, requireAdmin, async (req, res) => {
    const { userId } = req.body;
    if (!userId)
        return res.status(400).json({ message: 'userId required' });
    await (0, mongo_1.connectMongo)();
    await mongo_1.MuteModel.deleteOne({ userId }).catch(() => void 0);
    return res.status(200).json({ ok: true });
});
exports.default = router;
//# sourceMappingURL=admin.routes.js.map