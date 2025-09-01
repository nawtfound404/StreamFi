import { ethers } from 'ethers';
import { env } from '../config/environment';
import { logger } from '../utils/logger';
import NitroliteABI from './abi/Nitrolite.json';

class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private registryContract: ethers.Contract;
  private adminWallet: ethers.Wallet;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(env.blockchain.rpcProvider);
    this.adminWallet = new ethers.Wallet(env.blockchain.adminPrivateKey, this.provider);
    this.registryContract = new ethers.Contract(
      env.blockchain.creatorVaultAddress,
      NitroliteABI.abi,
      this.adminWallet
    );
    logger.info('Blockchain service initialized.');
  }

  /**
   * Creates a vault for a user on-chain.
   */
  public async createVaultForUser(userWalletAddress: string): Promise<bigint> {
    try {
      logger.info(`Sending transaction to create vault for owner: ${userWalletAddress}`);
      const tx = await this.registryContract.createVault(userWalletAddress);
      logger.info(`Transaction sent. Hash: ${tx.hash}. Waiting for confirmation...`);
      const receipt = await tx.wait(1);

      for (const log of receipt.logs) {
        try {
          const parsedLog = this.registryContract.interface.parseLog(log);
          if (parsedLog && parsedLog.name === 'VaultCreated') {
            const vaultId: bigint = parsedLog.args.vaultId;
            logger.info(`Transaction confirmed. New Vault ID: ${vaultId.toString()}`);
            return vaultId;
          }
        } catch {
          // Ignore logs that don’t match VaultCreated
        }
      }

      throw new Error('VaultCreated event not found in transaction receipt.');
    } catch (error) {
      logger.error({ err: error }, 'Failed to create on-chain vault');
      throw new Error('On-chain vault creation failed.');
    }
  }

  /**
   * Listen for Deposit events on the contract.
   */
  public listenForDonations() {
    const contractAddress = env.blockchain.creatorVaultAddress;
    logger.info(`👂 Listening for Deposit events on contract: ${contractAddress}`);

    // ethers v6 event listeners automatically type args + event object
    this.registryContract.on(
      'Deposit',
      (vaultId: bigint, donor: string, amount: bigint, event: ethers.EventLog) => {
        logger.info('🎉 New On-Chain Donation Received!');
        logger.info(`  -> Vault ID: ${vaultId.toString()}`);
        logger.info(`  -> From: ${donor}`);
        logger.info(`  -> Amount: ${ethers.formatEther(amount)} ETH`);
        logger.info(`  -> Transaction: https://sepolia.etherscan.io/tx/${event.transactionHash}`);
      }
    );
  }
}

export const blockchainService = new BlockchainService();
