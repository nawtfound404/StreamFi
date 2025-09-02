"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const yellow_service_1 = require("../../services/yellow.service");
const router = (0, express_1.Router)();
// Rate limiter: 60 requests per minute per IP
const limiter = (0, express_rate_limit_1.default)({ windowMs: 60_000, max: 60 });
router.use(auth_middleware_1.authMiddleware);
router.use(limiter);
// GET /api/yellow/markets/:symbol
router.get('/markets/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const data = await yellow_service_1.yellowService.getMarketData(symbol);
        return res.status(200).json(data);
    }
    catch (e) {
        return res.status(502).json({ message: e?.message || 'yellow market error' });
    }
});
// POST /api/yellow/orders
router.post('/orders', async (req, res) => {
    try {
        const order = await yellow_service_1.yellowService.placeOrder(req.body);
        return res.status(200).json(order);
    }
    catch (e) {
        return res.status(502).json({ message: e?.message || 'yellow order error' });
    }
});
exports.default = router;
//# sourceMappingURL=yellow.routes.js.map