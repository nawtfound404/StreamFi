import { ethers } from 'ethers';
import { prisma } from '../lib/prisma';
import { env } from '../config/environment';
import { logger } from '../utils/logger';
import NitroliteABI from './abi/Nitrolite';

export class NftIndexerService {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private transferTopic: string;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(env.blockchain.rpcProvider);
    this.contract = new ethers.Contract(env.blockchain.creatorVaultAddress, NitroliteABI.abi, this.provider);
    const evt = this.contract.interface.getEvent('Transfer');
    if (!evt) throw new Error('Transfer event not found in ABI');
    this.transferTopic = evt.topicHash;
  }

  private async getLastProcessedBlock(): Promise<bigint> {
    const state = await prisma.nftSyncState.findUnique({ where: { id: 'nitrolite' } });
    return state?.lastBlock ?? BigInt(env.blockchain.deployFromBlock ?? 0);
  }

  private async setLastProcessedBlock(block: bigint) {
    await prisma.nftSyncState.upsert({
      where: { id: 'nitrolite' },
      update: { lastBlock: block },
      create: { id: 'nitrolite', lastBlock: block },
    });
  }

  public ipfsToHttp(uri: string | null | undefined): string | undefined {
    if (!uri) return undefined;
    if (uri.startsWith('ipfs://')) {
      return `${env.ipfsGateway}/ipfs/${uri.replace('ipfs://', '')}`;
    }
    return uri;
  }

  /** Backfill Transfer logs and update DB ownership for tokens. */
  public async backfill() {
    const batchSize = Number(env.indexer.batchSize ?? 5000);
    const latest = await this.provider.getBlockNumber();
    const reorgDepth = Number(env.indexer.reorgDepth ?? 6);
    const safeHead = latest > reorgDepth ? latest - reorgDepth : 0;
    let from = Number(await this.getLastProcessedBlock());
    const deployFrom = env.blockchain.deployFromBlock ?? 0;
    if (!from || from < deployFrom) from = deployFrom;
    // Slide back a small window to reconcile potential reorgs
    from = Math.max(deployFrom, Math.min(from, safeHead));
    if (from > safeHead) {
      logger.info(`NFT Indexer: up to date. safeHead=${safeHead}, from=${from}`);
      return;
    }
    logger.info(`NFT Indexer backfill from block ${from} to ${safeHead} (latest=${latest}, reorgDepth=${reorgDepth}) in batches of ${batchSize}`);
    for (let start = from; start <= safeHead; start += batchSize) {
      const end = Math.min(start + batchSize - 1, safeHead);
      const logs = await this.provider.getLogs({
        address: this.contract.target as string,
        fromBlock: start,
        toBlock: end,
        topics: [this.transferTopic],
      });
      for (const log of logs) {
        try {
          const parsed = this.contract.interface.parseLog(log)!;
          const tokenId = parsed.args.tokenId as bigint;
          const to = (parsed.args.to as string).toLowerCase();
          // Fetch tokenURI best-effort
          let tokenURI: string | undefined;
          try { tokenURI = await this.contract.tokenURI(tokenId); } catch {}
          await prisma.nftToken.upsert({
            where: { tokenId },
            update: { ownerAddress: to, tokenURI },
            create: { tokenId, ownerAddress: to, tokenURI },
          });
        } catch (e) {
          logger.warn({ err: e }, 'Failed to parse/process Transfer log');
        }
      }
      await this.setLastProcessedBlock(BigInt(end));
      logger.info(`Processed blocks ${start}-${end}, logs=${logs.length}`);
    }
  }

  /** Subscribe to live Transfer events and update DB in real-time. */
  public subscribe() {
    this.contract.on('Transfer', async (_from: string, to: string, tokenId: bigint, event: any) => {
      try {
        const latest = await this.provider.getBlockNumber();
        const reorgDepth = Number(env.indexer.reorgDepth ?? 6);
        if (latest - Number(event?.blockNumber ?? latest) < reorgDepth) return; // wait for confirmations
        const addr = to.toLowerCase();
        let tokenURI: string | undefined;
        try { tokenURI = await this.contract.tokenURI(tokenId); } catch {}
        await prisma.nftToken.upsert({
          where: { tokenId },
          update: { ownerAddress: addr, tokenURI },
          create: { tokenId, ownerAddress: addr, tokenURI },
        });
        logger.info(`NFT Indexer live update token ${tokenId.toString()} -> ${addr}`);
      } catch (e) {
        logger.warn({ err: e }, 'Failed live Transfer processing');
      }
    });
  }
}

export const nftIndexer = new NftIndexerService();
