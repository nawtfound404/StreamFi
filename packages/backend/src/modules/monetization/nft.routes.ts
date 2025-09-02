import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../../middlewares/auth.middleware';
import { blockchainService } from '../../services/blockchain.service';

const router = Router();

// POST /api/monetization/nft/mint { toWallet }
router.post('/nft/mint', authMiddleware, async (req: AuthRequest, res) => {
  const { toWallet } = req.body as { toWallet: string };
  if (!toWallet) return res.status(400).json({ message: 'toWallet required' });
  try {
    const tokenId = await blockchainService.mintNft(toWallet);
    return res.status(200).json({ ok: true, tokenId: tokenId.toString() });
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || 'mint failed' });
  }
});

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
    const tokenIds = await blockchainService.getTokensByOwner(address);
    const items = await Promise.all(
      tokenIds.map(async (id) => {
        try {
          const tokenURI = await blockchainService.getTokenUri(id);
          return { tokenId: id.toString(), tokenURI };
        } catch {
          return { tokenId: id.toString(), tokenURI: '' };
        }
      })
    );
    return res.status(200).json({ items });
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || 'list failed' });
  }
});

export default router;
