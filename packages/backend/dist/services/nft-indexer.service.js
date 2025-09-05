"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.nftIndexer = exports.NftIndexerService = void 0;
const ethers_1 = require("ethers");
const mongo_1 = require("../lib/mongo");
const environment_1 = require("../config/environment");
const logger_1 = require("../utils/logger");
const Nitrolite_1 = __importDefault(require("./abi/Nitrolite"));
class NftIndexerService {
    provider;
    contract;
    transferTopic;
    constructor() {
        this.provider = new ethers_1.ethers.JsonRpcProvider(environment_1.env.blockchain.rpcProvider);
        this.contract = new ethers_1.ethers.Contract(environment_1.env.blockchain.creatorVaultAddress, Nitrolite_1.default.abi, this.provider);
        const evt = this.contract.interface.getEvent('Transfer');
        if (!evt)
            throw new Error('Transfer event not found in ABI');
        this.transferTopic = evt.topicHash;
    }
    async getLastProcessedBlock() {
        await (0, mongo_1.connectMongo)();
        const state = await mongo_1.NftSyncStateModel.findById('nitrolite').lean();
        return state?.lastBlock ?? BigInt(environment_1.env.blockchain.deployFromBlock ?? 0);
    }
    async setLastProcessedBlock(block) {
        await (0, mongo_1.connectMongo)();
        await mongo_1.NftSyncStateModel.updateOne({ _id: 'nitrolite' }, { $set: { lastBlock: block } }, { upsert: true });
    }
    ipfsToHttp(uri) {
        if (!uri)
            return undefined;
        if (uri.startsWith('ipfs://')) {
            return `${environment_1.env.ipfsGateway}/ipfs/${uri.replace('ipfs://', '')}`;
        }
        return uri;
    }
    /** Backfill Transfer logs and update DB ownership for tokens. */
    async backfill() {
        const batchSize = Number(environment_1.env.indexer.batchSize ?? 5000);
        const latest = await this.provider.getBlockNumber();
        const reorgDepth = Number(environment_1.env.indexer.reorgDepth ?? 6);
        const safeHead = latest > reorgDepth ? latest - reorgDepth : 0;
        let from = Number(await this.getLastProcessedBlock());
        const deployFrom = environment_1.env.blockchain.deployFromBlock ?? 0;
        if (!from || from < deployFrom)
            from = deployFrom;
        // Slide back a small window to reconcile potential reorgs
        from = Math.max(deployFrom, Math.min(from, safeHead));
        if (from > safeHead) {
            logger_1.logger.info(`NFT Indexer: up to date. safeHead=${safeHead}, from=${from}`);
            return;
        }
        logger_1.logger.info(`NFT Indexer backfill from block ${from} to ${safeHead} (latest=${latest}, reorgDepth=${reorgDepth}) in batches of ${batchSize}`);
        for (let start = from; start <= safeHead; start += batchSize) {
            const end = Math.min(start + batchSize - 1, safeHead);
            const logs = await this.provider.getLogs({
                address: this.contract.target,
                fromBlock: start,
                toBlock: end,
                topics: [this.transferTopic],
            });
            for (const log of logs) {
                try {
                    const parsed = this.contract.interface.parseLog(log);
                    const tokenId = parsed.args.tokenId;
                    const to = parsed.args.to.toLowerCase();
                    // Fetch tokenURI best-effort
                    let tokenURI;
                    try {
                        tokenURI = await this.contract.tokenURI(tokenId);
                    }
                    catch { }
                    await (0, mongo_1.connectMongo)();
                    await mongo_1.NftTokenModel.updateOne({ tokenId }, { $set: { ownerAddress: to, tokenURI } }, { upsert: true });
                }
                catch (e) {
                    logger_1.logger.warn({ err: e }, 'Failed to parse/process Transfer log');
                }
            }
            await this.setLastProcessedBlock(BigInt(end));
            logger_1.logger.info(`Processed blocks ${start}-${end}, logs=${logs.length}`);
        }
    }
    /** Subscribe to live Transfer events and update DB in real-time. */
    subscribe() {
        this.contract.on('Transfer', async (_from, to, tokenId, event) => {
            try {
                const latest = await this.provider.getBlockNumber();
                const reorgDepth = Number(environment_1.env.indexer.reorgDepth ?? 6);
                if (latest - Number(event?.blockNumber ?? latest) < reorgDepth)
                    return; // wait for confirmations
                const addr = to.toLowerCase();
                let tokenURI;
                try {
                    tokenURI = await this.contract.tokenURI(tokenId);
                }
                catch { }
                await (0, mongo_1.connectMongo)();
                await mongo_1.NftTokenModel.updateOne({ tokenId }, { $set: { ownerAddress: addr, tokenURI } }, { upsert: true });
                logger_1.logger.info(`NFT Indexer live update token ${tokenId.toString()} -> ${addr}`);
            }
            catch (e) {
                logger_1.logger.warn({ err: e }, 'Failed live Transfer processing');
            }
        });
    }
}
exports.NftIndexerService = NftIndexerService;
exports.nftIndexer = new NftIndexerService();
//# sourceMappingURL=nft-indexer.service.js.map