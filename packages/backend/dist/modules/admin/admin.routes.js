"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Simple role-check middleware for admin-only routes
function requireAdmin(req, res, next) {
    if (req.user?.role === 'ADMIN')
        return next();
    return res.status(403).json({ message: 'Forbidden' });
}
router.post('/mute', auth_middleware_1.authMiddleware, requireAdmin, (_req, res) => {
    return res.status(200).json({ ok: true });
});
router.post('/ban', auth_middleware_1.authMiddleware, requireAdmin, (_req, res) => {
    return res.status(200).json({ ok: true });
});
exports.default = router;
//# sourceMappingURL=admin.routes.js.map