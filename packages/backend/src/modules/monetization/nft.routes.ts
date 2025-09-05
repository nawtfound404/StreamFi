import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../../middlewares/auth.middleware';
import { blockchainService } from '../../services/blockchain.service';
// TODO: implement NFT-related routes with Mongo models if needed
import { env } from '../../config/environment';
import { NftTokenModel, connectMongo } from '../../lib/mongo';

const router = Router();

// NFT minting is disabled per requirements.
// router.post('/nft/mint', authMiddleware, async (req: AuthRequest, res) => { return res.status(410).json({ message: 'minting disabled' }); });

// GET /api/monetization/nft/:tokenId -> { owner, tokenURI }
router.get('/nft/:tokenId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { tokenId } = req.params;
    const [owner, tokenURI] = await Promise.all([
      blockchainService.ownerOf(tokenId),
      blockchainService.getTokenUri(tokenId),
    ]);
    return res.status(200).json({ tokenId, owner, tokenURI });
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || 'read failed' });
  }
});

// GET /api/monetization/nft/owner/:address -> { items: [{ tokenId, tokenURI }] }
router.get('/nft/owner/:address', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { address } = req.params;
    const cursor = req.query.cursor ? BigInt(String(req.query.cursor)) : undefined; // tokenId cursor
    const limit = Math.max(1, Math.min(100, Number(req.query.limit ?? 20)));
    // Prefer DB index for speed; fallback to chain scan when empty
    await connectMongo();
    const where: any = cursor ? { ownerAddress: address.toLowerCase(), tokenId: { $gt: cursor } } : { ownerAddress: address.toLowerCase() };
  const indexed: any[] = await NftTokenModel.find(where).sort({ tokenId: 1 }).limit(limit + 1).lean();
  if (indexed.length) {
      const hasMore = indexed.length > limit;
      const page = hasMore ? indexed.slice(0, limit) : indexed;
      const nextCursor = hasMore ? String(page[page.length - 1].tokenId) : null;
      return res.status(200).json({
        items: page.map((i: any) => ({ tokenId: String(i.tokenId), tokenURI: String(i.tokenURI || '') })),
        nextCursor,
      });
    }
    const tokenIds = await blockchainService.getTokensByOwner(address);
    const sorted = tokenIds.map((x) => BigInt(x)).sort((a,b)=> (a<b?-1:a>b?1:0));
    const startIdx = cursor ? sorted.findIndex((t)=> t>cursor) : 0;
    const slice = sorted.slice(startIdx, startIdx + limit);
    const items = await Promise.all(slice.map(async (id) => {
      try { const tokenURI = await blockchainService.getTokenUri(id); return { tokenId: id.toString(), tokenURI }; } catch { return { tokenId: id.toString(), tokenURI: '' }; }
    }));
    const nextCursor = sorted.length > startIdx + limit ? String(slice[slice.length - 1]) : null;
    return res.status(200).json({ items, nextCursor });
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || 'list failed' });
  }
});

// GET /api/monetization/nft/:tokenId/metadata -> resolves token metadata JSON with IPFS gateway
// Metadata route disabled for now; indexer can be re-enabled later if needed.
// router.get('/nft/:tokenId/metadata', authMiddleware, async (req: AuthRequest, res) => { return res.status(410).json({ message: 'metadata disabled' }); });

export default router;
