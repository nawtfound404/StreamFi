import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { prisma } from '../../lib/prisma';
import { blockchainService } from '../../services/blockchain.service';
import { logger } from '../../utils/logger';

export const createVault = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { walletAddress } = req.body;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  if (!walletAddress || !walletAddress.startsWith('0x')) {
    return res.status(400).json({ message: 'Valid walletAddress is required' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    // ⚠️ Only works if you added `vaultId` to your Prisma schema.
    if ((user as any)?.vaultId) {
      return res.status(409).json({ message: 'User already has a vault' });
    }

    const newVaultId = await blockchainService.createVaultForUser(walletAddress);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        walletAddress,
        // Cast to `any` until Prisma schema includes vaultId
        ...(newVaultId && { vaultId: newVaultId as any }),
      },
    });

    res.status(201).json({
      message: 'Vault created successfully',
      vaultId: newVaultId?.toString(),
      user: updatedUser,
    });
  } catch (error) {
    logger.error({ err: error }, 'Vault creation controller error');
    res.status(500).json({ message: 'Failed to create vault' });
  }
};
