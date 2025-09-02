"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../../lib/prisma");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const router = (0, express_1.Router)();
const postLimiter = (0, express_rate_limit_1.default)({ windowMs: 10_000, max: 10 });
router.get('/:streamId/messages', async (req, res) => {
    const items = await prisma_1.prisma.chatMessage.findMany({
        where: { streamId: req.params.streamId },
        orderBy: { createdAt: 'asc' },
        take: 200,
    });
    res.json({ items });
});
router.post('/:streamId/messages', auth_middleware_1.authMiddleware, postLimiter, async (req, res) => {
    // Reject if muted
    const isMuted = await prisma_1.prisma.mute.findUnique({ where: { userId: req.user.id } });
    if (isMuted)
        return res.status(403).json({ message: 'Muted' });
    const { text } = req.body;
    if (!text?.trim())
        return res.status(400).json({ message: 'Text required' });
    const msg = await prisma_1.prisma.chatMessage.create({
        data: { streamId: req.params.streamId, userId: req.user.id, text: text.slice(0, 500) },
    });
    res.status(201).json({ item: msg });
});
exports.default = router;
//# sourceMappingURL=chat.routes.js.map