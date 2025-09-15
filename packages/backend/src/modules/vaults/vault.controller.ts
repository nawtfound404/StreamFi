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

  // If user already has a vault, allow updating walletAddress idempotently
    if ((user as any)?.vaultId) {
      // If wallet changed, update it; else no-op
      const needsUpdate = String((user as any)?.walletAddress || '').toLowerCase() !== String(walletAddress).toLowerCase();
      if (needsUpdate) {
        try {
          await UserModel.updateOne({ _id: userId }, { $set: { walletAddress } });
        } catch (e: any) {
          if (e?.code === 11000) {
            return res.status(409).json({ message: 'Wallet address already in use' });
          }
          throw e;
        }
      }
      const updatedUser = await UserModel.findById(userId).lean();
      return res.status(200).json({
        message: needsUpdate ? 'Vault exists; wallet updated' : 'Vault already exists',
        vaultId: String((updatedUser as any)?.vaultId ?? ''),
        user: updatedUser,
        created: false,
      });
    }

    // Try to discover an existing vault on-chain for this owner
    try {
      const owned = await blockchainService.getTokensByOwner(walletAddress);
      if (owned && owned.length > 0) {
        const attachId = owned[0];
        try {
          await UserModel.updateOne({ _id: userId }, { $set: { walletAddress, vaultId: attachId.toString() } });
        } catch (e: any) {
          if (e?.code === 11000) {
            if (process.env.NODE_ENV !== 'production') {
              // Dev-mode recovery: transfer wallet/vault ownership to current user
              const conflict = await UserModel.findOne({ walletAddress: walletAddress.toLowerCase() }).lean();
              if (conflict && String((conflict as any)._id) !== String(userId)) {
                await UserModel.updateOne({ _id: (conflict as any)._id }, { $unset: { walletAddress: "", vaultId: "" } });
                await UserModel.updateOne({ _id: userId }, { $set: { walletAddress, vaultId: attachId.toString() } });
              }
            } else {
              return res.status(409).json({ message: 'Wallet address already in use' });
            }
          } else {
            throw e;
          }
        }
        const updatedUser = await UserModel.findById(userId).lean();
        return res.status(200).json({ message: 'Attached existing vault', vaultId: attachId.toString(), user: updatedUser, created: false });
      }
    } catch (e) {
      // Non-fatal; fall through to attempt mint/createVault
    }

    const newVaultId = await blockchainService.createVaultForUser(walletAddress);

    try {
      await UserModel.updateOne({ _id: userId }, { $set: { walletAddress, ...(newVaultId ? { vaultId: newVaultId as any } : {}) } });
    } catch (e: any) {
      if (e?.code === 11000) {
        if (process.env.NODE_ENV !== 'production') {
          const conflict = await UserModel.findOne({ walletAddress: walletAddress.toLowerCase() }).lean();
          if (conflict && String((conflict as any)._id) !== String(userId)) {
            await UserModel.updateOne({ _id: (conflict as any)._id }, { $unset: { walletAddress: "", vaultId: "" } });
            await UserModel.updateOne({ _id: userId }, { $set: { walletAddress, ...(newVaultId ? { vaultId: newVaultId as any } : {}) } });
          }
        } else {
          return res.status(409).json({ message: 'Wallet address already in use' });
        }
      } else {
        throw e;
      }
    }
    const updatedUser = await UserModel.findById(userId).lean();

    res.status(201).json({
      message: 'Vault created successfully',
      vaultId: newVaultId?.toString(),
      user: updatedUser,
      created: true,
    });
  } catch (error) {
    logger.error({ err: error }, 'Vault creation controller error');
    res.status(500).json({ message: 'Failed to create vault' });
  }
};
