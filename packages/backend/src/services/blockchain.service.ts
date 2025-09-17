import { ethers } from 'ethers';
import { env } from '../config/environment';
import { NftTokenModel, connectMongo } from '../lib/mongo';
import { logger } from '../utils/logger';
// Import without extension so the built JS can require './abi/Nitrolite.js' at runtime inside the container
import NitroliteABI from './abi/Nitrolite';

class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private registryContract: ethers.Contract;
  private adminWallet: ethers.Wallet | null = null;
  private hasDirectMint: boolean = false;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(env.blockchain.rpcProvider);
    // Try to create admin wallet if the key looks valid (not all zeros and proper length)
    const key = env.blockchain.adminPrivateKey?.toLowerCase?.() || '';
    const isAllZeros = /^0x0+$/.test(key);
    const looksHex66 = /^0x[0-9a-f]{64}$/.test(key);
    try {
      if (looksHex66 && !isAllZeros) {
        this.adminWallet = new ethers.Wallet(env.blockchain.adminPrivateKey, this.provider);
      } else {
        this.adminWallet = null;
        logger.warn('ADMIN_PRIVATE_KEY not configured or invalid. Running in read-only mode.');
      }
    } catch (e) {
      this.adminWallet = null;
      logger.warn({ err: e }, 'Failed to initialize admin wallet. Running in read-only mode.');
    }
    // Use signer if available; otherwise provider for read-only access and event subscriptions
    const signerOrProvider = this.adminWallet ?? this.provider;
    this.registryContract = new ethers.Contract(
      env.blockchain.creatorVaultAddress,
      NitroliteABI.abi,
      signerOrProvider
    );
    // Detect if contract exposes direct mint(address)
    this.hasDirectMint = typeof (this.registryContract as any).mint === 'function';
    logger.info('Blockchain service initialized.');
  }

  /**
   * Creates a vault for a user on-chain.
   */
  public async createVaultForUser(userWalletAddress: string): Promise<bigint> {
    // Dev-friendly fallback when on-chain writes are not available
    if (!this.adminWallet) {
      if (process.env.NODE_ENV !== 'production') {
        // Derive a deterministic mock vault id from the wallet address (lower 56 bits of keccak)
        const h = ethers.keccak256(ethers.toUtf8Bytes(userWalletAddress.toLowerCase()));
        const v = BigInt(h) & ((1n << 56n) - 1n);
        logger.warn({ owner: userWalletAddress, vaultId: v.toString() }, 'Admin wallet not configured; returning mock vault id (dev mode)');
        return v;
      }
      throw new Error('Admin wallet is not configured. Set ADMIN_PRIVATE_KEY to enable on-chain writes.');
    }
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
      if (process.env.NODE_ENV !== 'production') {
        const h = ethers.keccak256(ethers.toUtf8Bytes(userWalletAddress.toLowerCase()));
        const v = BigInt(h) & ((1n << 56n) - 1n);
        logger.warn({ err: (error as any)?.message, owner: userWalletAddress, vaultId: v.toString() }, 'On-chain vault creation failed; returning mock vault id (dev mode)');
        return v;
      }
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
    if (!this.adminWallet) {
      throw new Error('Admin wallet is not configured. Set ADMIN_PRIVATE_KEY to enable on-chain writes.');
    }
    if (this.hasDirectMint) {
      try {
        const tx = await (this.registryContract as any).mint(toWallet);
        const receipt = await tx.wait(1);
        for (const log of receipt.logs) {
          try {
            const parsed = this.registryContract.interface.parseLog(log);
            if (parsed && parsed.name === 'Transfer') {
              const tokenId: bigint = parsed.args.tokenId;
              return tokenId;
            }
          } catch {}
        }
        throw new Error('Mint succeeded but Transfer not found');
      } catch (e) {
        // Fallback to createVault
        return this.createVaultForUser(toWallet);
      }
    }
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

  /** Faster owner lookup via DB index if available. */
  public async getTokensByOwnerIndexed(owner: string): Promise<{ tokenId: string; tokenURI?: string }[]> {
  await connectMongo();
  const items = await NftTokenModel.find({ ownerAddress: owner.toLowerCase() }).sort({ tokenId: 1 }).lean();
  return items.map((i: any) => ({ tokenId: i.tokenId.toString(), tokenURI: i.tokenURI || undefined }));
  }

  /** Resolve token metadata JSON using IPFS gateway. */
  public async fetchTokenMetadata(tokenURI: string): Promise<any | null> {
    const url = tokenURI.startsWith('ipfs://') ? `${env.ipfsGateway}/ipfs/${tokenURI.replace('ipfs://','')}` : tokenURI;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  /** Admin-funded deposit into a creator vault (Nitrolite deposit). */
  public async depositToVault(vaultId: bigint | number | string, amountWei: bigint): Promise<string> {
    if (!this.adminWallet) {
      if (process.env.NODE_ENV !== 'production') {
        const mock = ethers.keccak256(ethers.toUtf8Bytes(`mock-deposit:${vaultId}:${amountWei.toString()}:${Date.now()}`));
        logger.warn({ vaultId: vaultId.toString(), amountWei: amountWei.toString(), tx: mock }, 'Dev mode: skipping on-chain deposit, returning mock tx');
        return mock;
      }
      throw new Error('Admin wallet not configured');
    }
    const id = BigInt(vaultId);
    const value = amountWei;
    logger.info(`Depositing ${ethers.formatEther(value)} ETH into vault ${id.toString()}`);
    const tx = await (this.registryContract as any).deposit(id, { value });
    const receipt = await tx.wait(1);
    logger.info(`Deposit tx confirmed: ${tx.hash}`);
    return receipt.transactionHash;
  }

  /** Relay a withdrawWithSignature for a creator vault to the receiver. */
  public async relayWithdrawWithSignature(vaultId: bigint | number | string, receiver: string, amountWei: bigint | number | string, signature: string): Promise<string> {
    if (!this.adminWallet) {
      if (process.env.NODE_ENV !== 'production') {
        const mock = ethers.keccak256(ethers.toUtf8Bytes(`mock-withdraw:${vaultId}:${receiver}:${String(amountWei)}:${Date.now()}`));
        logger.warn({ vaultId: String(vaultId), receiver, amountWei: String(amountWei), tx: mock }, 'Dev mode: skipping on-chain withdraw, returning mock tx');
        return mock;
      }
      throw new Error('Admin wallet not configured');
    }
    const id = BigInt(vaultId);
    const amt = BigInt(amountWei);
    logger.info({ id: id.toString(), receiver, amount: ethers.formatEther(amt) }, 'Relaying withdrawWithSignature');
    const tx = await (this.registryContract as any).withdrawWithSignature(id, receiver, amt, signature);
    const rc = await tx.wait(1);
    return rc.transactionHash;
  }
}

export const blockchainService = new BlockchainService();
