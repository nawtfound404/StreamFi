"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const monetization_controller_1 = require("./monetization.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authMiddleware);
router.get('/summary', monetization_controller_1.getSummary);
router.get('/donations', monetization_controller_1.getDonations);
router.get('/nfts', monetization_controller_1.getNfts);
router.get('/payouts', monetization_controller_1.getPayouts);
exports.default = router;
//# sourceMappingURL=monetization.routes.js.map