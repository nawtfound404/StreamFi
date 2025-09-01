"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_routes_1 = __importDefault(require("../modules/auth/auth.routes"));
const user_routes_1 = __importDefault(require("../modules/users/user.routes"));
const stream_routes_1 = __importDefault(require("../modules/stream/stream.routes"));
const monetization_routes_1 = __importDefault(require("../modules/monetization/monetization.routes"));
const notification_routes_1 = __importDefault(require("../modules/notifications/notification.routes"));
const vault_routes_1 = __importDefault(require("../modules/vaults/vault.routes"));
const router = (0, express_1.Router)();
router.use('/auth', auth_routes_1.default);
router.use('/users', user_routes_1.default);
router.use('/stream', stream_routes_1.default);
router.use('/monetization', monetization_routes_1.default);
router.use('/notifications', notification_routes_1.default);
router.use('/vaults', vault_routes_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map