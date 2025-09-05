"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const blockchain_service_1 = require("../../services/blockchain.service");
const mongo_1 = require("../../lib/mongo");
const router = (0, express_1.Router)();
// NFT minting is disabled per requirements.
// router.post('/nft/mint', authMiddleware, async (req: AuthRequest, res) => { return res.status(410).json({ message: 'minting disabled' }); });
// GET /api/monetization/nft/:tokenId -> { owner, tokenURI }
router.get('/nft/:tokenId', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const { tokenId } = req.params;
        const [owner, tokenURI] = await Promise.all([
            blockchain_service_1.blockchainService.ownerOf(tokenId),
            blockchain_service_1.blockchainService.getTokenUri(tokenId),
        ]);
        return res.status(200).json({ tokenId, owner, tokenURI });
    }
    catch (e) {
        return res.status(500).json({ message: e?.message || 'read failed' });
    }
});
// GET /api/monetization/nft/owner/:address -> { items: [{ tokenId, tokenURI }] }
router.get('/nft/owner/:address', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const { address } = req.params;
        const cursor = req.query.cursor ? BigInt(String(req.query.cursor)) : undefined; // tokenId cursor
        const limit = Math.max(1, Math.min(100, Number(req.query.limit ?? 20)));
        // Prefer DB index for speed; fallback to chain scan when empty
        await (0, mongo_1.connectMongo)();
        const where = cursor ? { ownerAddress: address.toLowerCase(), tokenId: { $gt: cursor } } : { ownerAddress: address.toLowerCase() };
        const indexed = await mongo_1.NftTokenModel.find(where).sort({ tokenId: 1 }).limit(limit + 1).lean();
        if (indexed.length) {
            const hasMore = indexed.length > limit;
            const page = hasMore ? indexed.slice(0, limit) : indexed;
            const nextCursor = hasMore ? String(page[page.length - 1].tokenId) : null;
            return res.status(200).json({
                items: page.map((i) => ({ tokenId: String(i.tokenId), tokenURI: String(i.tokenURI || '') })),
                nextCursor,
            });
        }
        const tokenIds = await blockchain_service_1.blockchainService.getTokensByOwner(address);
        const sorted = tokenIds.map((x) => BigInt(x)).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
        const startIdx = cursor ? sorted.findIndex((t) => t > cursor) : 0;
        const slice = sorted.slice(startIdx, startIdx + limit);
        const items = await Promise.all(slice.map(async (id) => {
            try {
                const tokenURI = await blockchain_service_1.blockchainService.getTokenUri(id);
                return { tokenId: id.toString(), tokenURI };
            }
            catch {
                return { tokenId: id.toString(), tokenURI: '' };
            }
        }));
        const nextCursor = sorted.length > startIdx + limit ? String(slice[slice.length - 1]) : null;
        return res.status(200).json({ items, nextCursor });
    }
    catch (e) {
        return res.status(500).json({ message: e?.message || 'list failed' });
    }
});
// GET /api/monetization/nft/:tokenId/metadata -> resolves token metadata JSON with IPFS gateway
// Metadata route disabled for now; indexer can be re-enabled later if needed.
// router.get('/nft/:tokenId/metadata', authMiddleware, async (req: AuthRequest, res) => { return res.status(410).json({ message: 'metadata disabled' }); });
exports.default = router;
//# sourceMappingURL=nft.routes.js.map