"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("./user.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authMiddleware);
router.get('/settings', user_controller_1.getSettings);
router.post('/settings', user_controller_1.updateSettings);
exports.default = router;
//# sourceMappingURL=user.routes.js.map