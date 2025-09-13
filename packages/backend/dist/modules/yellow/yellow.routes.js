"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
// Yellow REST routes removed (no Yellow API usage). Keep an empty, protected router for compatibility.
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authMiddleware);
router.get('/health', (_req, res) => {
    return res.json({ ok: true, message: 'Yellow API disabled; using on-chain channel manager.' });
});
exports.default = router;
//# sourceMappingURL=yellow.routes.js.map