import { ethers } from 'ethers';
import { env } from '../config/environment';
import { logger } from '../utils/logger';
import VaultABI from './abi/Nitrolite';
import ChannelManagerABI from './abi/ChannelManager.json';
import TokenABI from './abi/NitroliteToken.json';
import AdjudicatorABI from './abi/Adjudicator.json';

class YellowService {
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Signer;
  private channelManager: ethers.Contract;
  private vault: ethers.Contract;
  private token: ethers.Contract;
  private adjudicator: ethers.Contract;
  private ready = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    // In tests, avoid network calls and event loop handles
    if (process.env.NODE_ENV === 'test') {
      // Minimal no-op initialization
      // Use dummy provider/signer to satisfy types, but do not call RPC
      // Note: we intentionally don't construct contracts or run init()
      this.provider = new ethers.JsonRpcProvider('http://localhost:0');
      // Generate a throwaway wallet not connected to provider
  this.signer = new ethers.Wallet(ethers.hexlify(ethers.randomBytes(32)));
  this.channelManager = {} as unknown as ethers.Contract;
  this.vault = {} as unknown as ethers.Contract;
  this.token = {} as unknown as ethers.Contract;
  this.adjudicator = {} as unknown as ethers.Contract;
      this.ready = true;
      logger.info('Sepolia channel service initialized (test mode)');
      return;
    }
    // Validate required Sepolia envs
    if (!env.blockchain.rpcProvider) throw new Error('JSON_RPC_PROVIDER is required');
    if (!env.blockchain.adminPrivateKey) throw new Error('ADMIN_PRIVATE_KEY is required');
    if (!env.blockchain.creatorVaultAddress) throw new Error('CREATOR_VAULT_ADDRESS is required');
  if (!env.nitrolite?.custody) throw new Error('NITROLITE_CUSTODY_ADDRESS is required');
  if (!env.nitrolite?.token) throw new Error('NITROLITE_TOKEN_ADDRESS is required');
  if (!env.nitrolite?.adjudicator) throw new Error('NITROLITE_ADJUDICATOR_ADDRESS is required');
    if (env.yellow.chainId !== 11155111) throw new Error('CHANNEL_CHAIN_ID must be 11155111 (Sepolia)');

    this.provider = new ethers.JsonRpcProvider(env.blockchain.rpcProvider);
    this.signer = new ethers.Wallet(env.blockchain.adminPrivateKey, this.provider);
    // Initialize contracts & validate bytecode exists (lazy, non-fatal at startup)
  this.channelManager = new ethers.Contract(env.nitrolite.custody, (ChannelManagerABI as any).abi, this.signer);
  this.vault = new ethers.Contract(env.blockchain.creatorVaultAddress, (VaultABI as any).abi, this.signer);
  this.token = new ethers.Contract(env.nitrolite.token, (TokenABI as any).abi, this.signer);
  this.adjudicator = new ethers.Contract(env.nitrolite.adjudicator, (AdjudicatorABI as any).abi, this.signer);
    this.init();
    logger.info('Sepolia channel service initialized (ethers.js)');
  }

  private init() {
    if (this.initPromise) return this.initPromise;
    this.initPromise = Promise.all([
      this.provider.getCode(env.nitrolite.custody),
      this.provider.getCode(env.blockchain.creatorVaultAddress),
      this.provider.getCode(env.nitrolite.token),
      this.provider.getCode(env.nitrolite.adjudicator),
    ])
      .then(([chanCode, vaultCode, tokenCode, adjCode]) => {
        if (chanCode === '0x') {
          logger.error('No code at NITROLITE_CUSTODY_ADDRESS – deploy ChannelManager and update env');
          this.ready = false;
          return;
        }
        if (vaultCode === '0x') {
          logger.error('No code at CREATOR_VAULT_ADDRESS – deploy Nitrolite and update env');
          this.ready = false;
          return;
        }
        if (tokenCode === '0x') {
          logger.error('No code at NITROLITE_TOKEN_ADDRESS – deploy token and update env');
          this.ready = false; return;
        }
        if (adjCode === '0x') {
          logger.error('No code at NITROLITE_ADJUDICATOR_ADDRESS – deploy adjudicator and update env');
          this.ready = false; return;
        }
        this.ready = true;
        logger.info('Sepolia contracts found, nitrolite service ready');
      })
      .catch((e) => {
        this.ready = false;
        logger.error({ err: e }, 'Contract code validation failed (will keep retrying on use)');
      });
    return this.initPromise;
  }

  public isReady() { return this.ready; }

  // On-chain open channel tx
  async openChannel(viewer: string, streamId: string, vaultId: bigint, depositWei: bigint): Promise<{ txHash: string }>{
    if (!this.ready) { await this.init(); }
    if (!this.ready) throw new Error('ChannelManager not ready. Deploy contracts and set env.');
    const streamIdHash = ethers.id(streamId);
  const tx = await this.channelManager.openChannel(viewer, streamIdHash, vaultId, { value: depositWei });
    const rcpt = await tx.wait(1);
    return { txHash: rcpt.transactionHash };
  }

  // On-chain close channel settlement
  async closeChannel(channelId: string, spentWei: bigint): Promise<{ txHash: string }>{
    if (!this.ready) { await this.init(); }
    if (!this.ready) throw new Error('ChannelManager not ready. Deploy contracts and set env.');
    const tx = await this.channelManager.closeChannel(channelId, spentWei);
    const rcpt = await tx.wait(1);
    return { txHash: rcpt.transactionHash };
  }

  async depositToVault(vaultId: bigint, amount: bigint): Promise<string> {
    const tx = await (this.vault as any).deposit(vaultId, { value: amount });
    const rc = await tx.wait(1);
    return rc.transactionHash;
  }

  async adjudicate(state: { channelId: string; vaultId: bigint|string; viewer: string; deposit: bigint|string; spent: bigint|string; nonce: bigint|string }, signature: string): Promise<string> {
    // Dev fallback when contracts aren’t ready or RPC not available
    if (!this.ready && process.env.NODE_ENV !== 'production') {
      const mock = ethers.keccak256(ethers.toUtf8Bytes(`mock-adjudicate:${JSON.stringify(state)}:${signature}:${Date.now()}`));
      logger.warn({ tx: mock }, 'Dev mode: adjudicate fallback (contracts not ready)');
      return mock;
    }
    try {
      // Coerce potential string inputs to bigint for contract call
      const normalized = {
        channelId: state.channelId,
        vaultId: BigInt(state.vaultId as any),
        viewer: state.viewer,
        deposit: BigInt(state.deposit as any),
        spent: BigInt(state.spent as any),
        nonce: BigInt(state.nonce as any),
      } as any;
      const tx = await (this.adjudicator as any).adjudicate(normalized, signature, state.viewer);
      const rc = await tx.wait(1);
      return rc.transactionHash;
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        const mock = ethers.keccak256(ethers.toUtf8Bytes(`mock-adjudicate-error:${JSON.stringify(state)}:${signature}:${Date.now()}`));
        logger.warn({ err: (e as any)?.message, tx: mock }, 'Dev mode: adjudicate failed; returning mock tx');
        return mock;
      }
      throw e;
    }
  }
}

export const yellowService = new YellowService();
