"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireStreamer = exports.requireAdmin = void 0;
exports.requireRole = requireRole;
const models_1 = require("../types/models");
function requireRole(...allowed) {
    return (req, res, next) => {
        const role = req.user?.role;
        if (!role)
            return res.status(401).json({ message: 'Unauthorized' });
        if (!allowed.includes(role))
            return res.status(403).json({ message: 'Forbidden' });
        return next();
    };
}
exports.requireAdmin = requireRole(models_1.UserRole.ADMIN, 'ADMIN');
exports.requireStreamer = requireRole(models_1.UserRole.STREAMER, 'STREAMER', 'streamer');
//# sourceMappingURL=rbac.middleware.js.map