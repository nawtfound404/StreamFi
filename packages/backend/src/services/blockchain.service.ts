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

  /**
   * Mint an NFT for the given wallet. In CreatorVault contract, this is equivalent
   * to creating a new vault which also mints an ERC-721 to the owner.
   */
  public async mintNft(toWallet: string): Promise<bigint> {
    return this.createVaultForUser(toWallet);
  }

  /** Get owner of a given tokenId (vaultId). */
  public async ownerOf(tokenId: bigint | number | string): Promise<string> {
    const id = BigInt(tokenId);
    return this.registryContract.ownerOf(id);
  }

  /** Get tokenURI for a given tokenId (vaultId). */
  public async getTokenUri(tokenId: bigint | number | string): Promise<string> {
    const id = BigInt(tokenId);
    return this.registryContract.tokenURI(id);
  }

  /** Derive owned tokenIds for an owner by scanning Transfer events. */
  public async getTokensByOwner(owner: string): Promise<bigint[]> {
    const fromBlock = env.blockchain.deployFromBlock ?? 0;
    const toBlock = 'latest' as const;
  const evt = this.registryContract.interface.getEvent('Transfer');
  if (!evt) throw new Error('Transfer event not found in ABI');
  const topicTransfer = evt.topicHash;
    // Build topics for from=owner and to=owner
    const topicsTo = [topicTransfer, null, ethers.zeroPadValue(owner as `0x${string}`, 32)];
    const topicsFrom = [topicTransfer, ethers.zeroPadValue(owner as `0x${string}`, 32), null];
    const [logsTo, logsFrom] = await Promise.all([
      this.provider.getLogs({ address: this.registryContract.target as string, fromBlock, toBlock, topics: topicsTo }),
      this.provider.getLogs({ address: this.registryContract.target as string, fromBlock, toBlock, topics: topicsFrom }),
    ]);
    const owned = new Set<bigint>();
    for (const log of logsTo) {
      const parsed = this.registryContract.interface.parseLog(log)!;
      const tokenId = parsed.args.tokenId as bigint;
      owned.add(tokenId);
    }
    for (const log of logsFrom) {
      const parsed = this.registryContract.interface.parseLog(log)!;
      const tokenId = parsed.args.tokenId as bigint;
      owned.delete(tokenId);
    }
    return [...owned];
  }
}

export const blockchainService = new BlockchainService();
