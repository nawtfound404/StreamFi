import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { blockchainService } from '../../services/blockchain.service';
import { UserModel, connectMongo } from '../../lib/mongo';

export const relayWithdraw = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { vaultId, receiver, amountWei, signature } = req.body as { vaultId: string; receiver: string; amountWei: string; signature: string };
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  if (!vaultId || !receiver || !amountWei || !signature) return res.status(400).json({ message: 'vaultId, receiver, amountWei, signature required' });
  if (!receiver.startsWith('0x')) return res.status(400).json({ message: 'receiver must be address' });
  await connectMongo();
  const user = await UserModel.findById(userId).lean();
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (String((user as any).vaultId ?? '') !== String(vaultId)) return res.status(403).json({ message: 'Not vault owner' });
  try {
    const txHash = await blockchainService.relayWithdrawWithSignature(BigInt(vaultId), receiver, BigInt(amountWei), signature);
    return res.json({ ok: true, txHash });
  } catch (e: any) {
    return res.status(400).json({ ok: false, message: e?.message || 'withdraw failed' });
  }
};
