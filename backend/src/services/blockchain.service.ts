import { ethers } from 'ethers';
import { env } from '../config/environment';

class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private adminWallet: ethers.Wallet;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(env.blockchain.rpcProvider);
    this.adminWallet = new ethers.Wallet(env.blockchain.adminPrivateKey!, this.provider);
  }
  async openChannel(_viewer: string, _streamer: string, _amount: number) { return { success: true, txHash: '0x...' }; }
  async closeChannel(_channelId: string) { return { success: true, txHash: '0x...' }; }
}
export const blockchainService = new BlockchainService();

