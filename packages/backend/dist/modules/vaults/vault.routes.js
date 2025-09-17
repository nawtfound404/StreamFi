"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const vault_controller_1 = require("./vault.controller");
const withdraw_controller_1 = require("./withdraw.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// This route is protected. Only a logged-in user can access it.
router.post('/', auth_middleware_1.authMiddleware, vault_controller_1.createVault);
router.post('/withdraw', auth_middleware_1.authMiddleware, withdraw_controller_1.relayWithdraw);
exports.default = router;
//# sourceMappingURL=vault.routes.js.map