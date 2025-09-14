"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.yellowService = void 0;
const ethers_1 = require("ethers");
const environment_1 = require("../config/environment");
const logger_1 = require("../utils/logger");
const Nitrolite_1 = __importDefault(require("./abi/Nitrolite"));
const ChannelManager_json_1 = __importDefault(require("./abi/ChannelManager.json"));
const NitroliteToken_json_1 = __importDefault(require("./abi/NitroliteToken.json"));
const Adjudicator_json_1 = __importDefault(require("./abi/Adjudicator.json"));
class YellowService {
    provider;
    signer;
    channelManager;
    vault;
    token;
    adjudicator;
    ready = false;
    initPromise = null;
    constructor() {
        // In tests, avoid network calls and event loop handles
        if (process.env.NODE_ENV === 'test') {
            // Minimal no-op initialization
            // Use dummy provider/signer to satisfy types, but do not call RPC
            // Note: we intentionally don't construct contracts or run init()
            this.provider = new ethers_1.ethers.JsonRpcProvider('http://localhost:0');
            // Generate a throwaway wallet not connected to provider
            this.signer = new ethers_1.ethers.Wallet(ethers_1.ethers.hexlify(ethers_1.ethers.randomBytes(32)));
            this.channelManager = {};
            this.vault = {};
            this.token = {};
            this.adjudicator = {};
            this.ready = true;
            logger_1.logger.info('Sepolia channel service initialized (test mode)');
            return;
        }
        // Validate required Sepolia envs
        if (!environment_1.env.blockchain.rpcProvider)
            throw new Error('JSON_RPC_PROVIDER is required');
        if (!environment_1.env.blockchain.adminPrivateKey)
            throw new Error('ADMIN_PRIVATE_KEY is required');
        if (!environment_1.env.blockchain.creatorVaultAddress)
            throw new Error('CREATOR_VAULT_ADDRESS is required');
        if (!environment_1.env.nitrolite?.custody)
            throw new Error('NITROLITE_CUSTODY_ADDRESS is required');
        if (!environment_1.env.nitrolite?.token)
            throw new Error('NITROLITE_TOKEN_ADDRESS is required');
        if (!environment_1.env.nitrolite?.adjudicator)
            throw new Error('NITROLITE_ADJUDICATOR_ADDRESS is required');
        if (environment_1.env.yellow.chainId !== 11155111)
            throw new Error('CHANNEL_CHAIN_ID must be 11155111 (Sepolia)');
        this.provider = new ethers_1.ethers.JsonRpcProvider(environment_1.env.blockchain.rpcProvider);
        this.signer = new ethers_1.ethers.Wallet(environment_1.env.blockchain.adminPrivateKey, this.provider);
        // Initialize contracts & validate bytecode exists (lazy, non-fatal at startup)
        this.channelManager = new ethers_1.ethers.Contract(environment_1.env.nitrolite.custody, ChannelManager_json_1.default.abi, this.signer);
        this.vault = new ethers_1.ethers.Contract(environment_1.env.blockchain.creatorVaultAddress, Nitrolite_1.default.abi, this.signer);
        this.token = new ethers_1.ethers.Contract(environment_1.env.nitrolite.token, NitroliteToken_json_1.default.abi, this.signer);
        this.adjudicator = new ethers_1.ethers.Contract(environment_1.env.nitrolite.adjudicator, Adjudicator_json_1.default.abi, this.signer);
        this.init();
        logger_1.logger.info('Sepolia channel service initialized (ethers.js)');
    }
    init() {
        if (this.initPromise)
            return this.initPromise;
        this.initPromise = Promise.all([
            this.provider.getCode(environment_1.env.nitrolite.custody),
            this.provider.getCode(environment_1.env.blockchain.creatorVaultAddress),
            this.provider.getCode(environment_1.env.nitrolite.token),
            this.provider.getCode(environment_1.env.nitrolite.adjudicator),
        ])
            .then(([chanCode, vaultCode, tokenCode, adjCode]) => {
            if (chanCode === '0x') {
                logger_1.logger.error('No code at NITROLITE_CUSTODY_ADDRESS – deploy ChannelManager and update env');
                this.ready = false;
                return;
            }
            if (vaultCode === '0x') {
                logger_1.logger.error('No code at CREATOR_VAULT_ADDRESS – deploy Nitrolite and update env');
                this.ready = false;
                return;
            }
            if (tokenCode === '0x') {
                logger_1.logger.error('No code at NITROLITE_TOKEN_ADDRESS – deploy token and update env');
                this.ready = false;
                return;
            }
            if (adjCode === '0x') {
                logger_1.logger.error('No code at NITROLITE_ADJUDICATOR_ADDRESS – deploy adjudicator and update env');
                this.ready = false;
                return;
            }
            this.ready = true;
            logger_1.logger.info('Sepolia contracts found, nitrolite service ready');
        })
            .catch((e) => {
            this.ready = false;
            logger_1.logger.error({ err: e }, 'Contract code validation failed (will keep retrying on use)');
        });
        return this.initPromise;
    }
    isReady() { return this.ready; }
    // On-chain open channel tx
    async openChannel(viewer, streamId, vaultId, depositWei) {
        if (!this.ready) {
            await this.init();
        }
        if (!this.ready)
            throw new Error('ChannelManager not ready. Deploy contracts and set env.');
        const streamIdHash = ethers_1.ethers.id(streamId);
        const tx = await this.channelManager.openChannel(viewer, streamIdHash, vaultId, { value: depositWei });
        const rcpt = await tx.wait(1);
        return { txHash: rcpt.transactionHash };
    }
    // On-chain close channel settlement
    async closeChannel(channelId, spentWei) {
        if (!this.ready) {
            await this.init();
        }
        if (!this.ready)
            throw new Error('ChannelManager not ready. Deploy contracts and set env.');
        const tx = await this.channelManager.closeChannel(channelId, spentWei);
        const rcpt = await tx.wait(1);
        return { txHash: rcpt.transactionHash };
    }
    async depositToVault(vaultId, amount) {
        const tx = await this.vault.deposit(vaultId, { value: amount });
        const rc = await tx.wait(1);
        return rc.transactionHash;
    }
    async adjudicate(state, signature) {
        // Coerce potential string inputs to bigint for contract call
        const normalized = {
            channelId: state.channelId,
            vaultId: BigInt(state.vaultId),
            viewer: state.viewer,
            deposit: BigInt(state.deposit),
            spent: BigInt(state.spent),
            nonce: BigInt(state.nonce),
        };
        const tx = await this.adjudicator.adjudicate(normalized, signature, state.viewer);
        const rc = await tx.wait(1);
        return rc.transactionHash;
    }
}
exports.yellowService = new YellowService();
//# sourceMappingURL=yellow.service.js.map