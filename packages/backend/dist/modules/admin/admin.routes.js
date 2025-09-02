"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../../lib/prisma");
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
    await prisma_1.prisma.mute.upsert({ where: { userId }, update: { reason }, create: { userId, reason } });
    return res.status(200).json({ ok: true });
});
router.post('/ban', auth_middleware_1.authMiddleware, requireAdmin, async (req, res) => {
    const { userId, reason } = req.body;
    if (!userId)
        return res.status(400).json({ message: 'userId required' });
    await prisma_1.prisma.user.update({ where: { id: userId }, data: { banned: true, bannedAt: new Date(), banReason: reason } });
    return res.status(200).json({ ok: true });
});
router.post('/unban', auth_middleware_1.authMiddleware, requireAdmin, async (req, res) => {
    const { userId } = req.body;
    if (!userId)
        return res.status(400).json({ message: 'userId required' });
    await prisma_1.prisma.user.update({ where: { id: userId }, data: { banned: false, bannedAt: null, banReason: null } });
    return res.status(200).json({ ok: true });
});
router.post('/unmute', auth_middleware_1.authMiddleware, requireAdmin, async (req, res) => {
    const { userId } = req.body;
    if (!userId)
        return res.status(400).json({ message: 'userId required' });
    await prisma_1.prisma.mute.delete({ where: { userId } }).catch(() => void 0);
    return res.status(200).json({ ok: true });
});
exports.default = router;
//# sourceMappingURL=admin.routes.js.map