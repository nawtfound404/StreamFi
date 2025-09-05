import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { UserModel, connectMongo } from '../../lib/mongo';
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
  await connectMongo();
  const user = await UserModel.findById(userId).lean();

    if ((user as any)?.vaultId) {
      return res.status(409).json({ message: 'User already has a vault' });
    }

    const newVaultId = await blockchainService.createVaultForUser(walletAddress);

  await UserModel.updateOne({ _id: userId }, { $set: { walletAddress, ...(newVaultId ? { vaultId: newVaultId as any } : {}) } });
  const updatedUser = await UserModel.findById(userId).lean();

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
