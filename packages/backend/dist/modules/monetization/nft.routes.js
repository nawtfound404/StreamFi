"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const blockchain_service_1 = require("../../services/blockchain.service");
const prisma_1 = require("../../lib/prisma");
const environment_1 = require("../../config/environment");
const router = (0, express_1.Router)();
// POST /api/monetization/nft/mint { toWallet }
router.post('/nft/mint', auth_middleware_1.authMiddleware, async (req, res) => {
    const { toWallet } = req.body;
    if (!toWallet)
        return res.status(400).json({ message: 'toWallet required' });
    try {
        const tokenId = await blockchain_service_1.blockchainService.mintNft(toWallet);
        return res.status(200).json({ ok: true, tokenId: tokenId.toString() });
    }
    catch (e) {
        return res.status(500).json({ message: e?.message || 'mint failed' });
    }
});
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
        const prismaAny = prisma_1.prisma;
        if (prismaAny.nftToken) {
            const where = cursor ? { ownerAddress: address.toLowerCase(), tokenId: { gt: cursor } } : { ownerAddress: address.toLowerCase() };
            const indexed = await prismaAny.nftToken.findMany({ where, orderBy: { tokenId: 'asc' }, take: limit + 1 });
            const hasMore = indexed.length > limit;
            const page = hasMore ? indexed.slice(0, limit) : indexed;
            const nextCursor = hasMore ? String(page[page.length - 1].tokenId) : null;
            return res.status(200).json({
                items: page.map((i) => ({ tokenId: i.tokenId.toString(), tokenURI: i.tokenURI || '' })),
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
router.get('/nft/:tokenId/metadata', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const { tokenId } = req.params;
        let tokenURI = null;
        // Try DB first
        const prismaAny = prisma_1.prisma;
        if (prismaAny.nftToken) {
            const row = await prismaAny.nftToken.findUnique({ where: { tokenId: BigInt(tokenId) } });
            if (row?.tokenURI)
                tokenURI = row.tokenURI;
        }
        if (!tokenURI)
            tokenURI = await blockchain_service_1.blockchainService.getTokenUri(tokenId);
        const url = tokenURI.startsWith('ipfs://') ? `${environment_1.env.ipfsGateway}/ipfs/${tokenURI.replace('ipfs://', '')}` : tokenURI;
        const r = await fetch(url);
        if (!r.ok)
            return res.status(502).json({ message: 'metadata fetch failed', tokenURI });
        const json = await r.json();
        // Optional pinning
        if (environment_1.env.pinata?.jwt && environment_1.env.pinata?.pinOnMetadataFetch) {
            try {
                await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${environment_1.env.pinata.jwt}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ pinataContent: json, pinataMetadata: { name: `streamfi-${tokenId}` } }),
                }).catch(() => void 0);
            }
            catch { }
        }
        return res.status(200).json({ tokenId, tokenURI, metadata: json });
    }
    catch (e) {
        return res.status(500).json({ message: e?.message || 'metadata failed' });
    }
});
exports.default = router;
//# sourceMappingURL=nft.routes.js.map