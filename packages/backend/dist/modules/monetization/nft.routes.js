"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const blockchain_service_1 = require("../../services/blockchain.service");
const router = (0, express_1.Router)();
// POST /api/monetization/nft/mint { toWallet }
router.post('/nft/mint', auth_middleware_1.authMiddleware, async (req, res) => {
    const { toWallet } = req.body;
    if (!toWallet)
        return res.status(400).json({ message: 'toWallet required' });
    try {
        // Here we reuse createVault for MVP; replace with actual mint call when ABI exposes it.
        const vaultId = await blockchain_service_1.blockchainService.createVaultForUser(toWallet);
        return res.status(200).json({ ok: true, vaultId: vaultId.toString() });
    }
    catch (e) {
        return res.status(500).json({ message: e?.message || 'mint failed' });
    }
});
exports.default = router;
//# sourceMappingURL=nft.routes.js.map