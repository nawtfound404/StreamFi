"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.blockchainService = void 0;
const ethers_1 = require("ethers");
const environment_1 = require("../config/environment");
const prisma_1 = require("../lib/prisma");
const logger_1 = require("../utils/logger");
const Nitrolite_json_1 = __importDefault(require("./abi/Nitrolite.json"));
class BlockchainService {
    provider;
    registryContract;
    adminWallet;
    hasDirectMint = false;
    constructor() {
        this.provider = new ethers_1.ethers.JsonRpcProvider(environment_1.env.blockchain.rpcProvider);
        this.adminWallet = new ethers_1.ethers.Wallet(environment_1.env.blockchain.adminPrivateKey, this.provider);
        this.registryContract = new ethers_1.ethers.Contract(environment_1.env.blockchain.creatorVaultAddress, Nitrolite_json_1.default.abi, this.adminWallet);
        // Detect if contract exposes direct mint(address)
        this.hasDirectMint = typeof this.registryContract.mint === 'function';
        logger_1.logger.info('Blockchain service initialized.');
    }
    /**
     * Creates a vault for a user on-chain.
     */
    async createVaultForUser(userWalletAddress) {
        try {
            logger_1.logger.info(`Sending transaction to create vault for owner: ${userWalletAddress}`);
            const tx = await this.registryContract.createVault(userWalletAddress);
            logger_1.logger.info(`Transaction sent. Hash: ${tx.hash}. Waiting for confirmation...`);
            const receipt = await tx.wait(1);
            for (const log of receipt.logs) {
                try {
                    const parsedLog = this.registryContract.interface.parseLog(log);
                    if (parsedLog && parsedLog.name === 'VaultCreated') {
                        const vaultId = parsedLog.args.vaultId;
                        logger_1.logger.info(`Transaction confirmed. New Vault ID: ${vaultId.toString()}`);
                        return vaultId;
                    }
                }
                catch {
                    // Ignore logs that don’t match VaultCreated
                }
            }
            throw new Error('VaultCreated event not found in transaction receipt.');
        }
        catch (error) {
            logger_1.logger.error({ err: error }, 'Failed to create on-chain vault');
            throw new Error('On-chain vault creation failed.');
        }
    }
    /**
     * Listen for Deposit events on the contract.
     */
    listenForDonations() {
        const contractAddress = environment_1.env.blockchain.creatorVaultAddress;
        logger_1.logger.info(`👂 Listening for Deposit events on contract: ${contractAddress}`);
        // ethers v6 event listeners automatically type args + event object
        this.registryContract.on('Deposit', (vaultId, donor, amount, event) => {
            logger_1.logger.info('🎉 New On-Chain Donation Received!');
            logger_1.logger.info(`  -> Vault ID: ${vaultId.toString()}`);
            logger_1.logger.info(`  -> From: ${donor}`);
            logger_1.logger.info(`  -> Amount: ${ethers_1.ethers.formatEther(amount)} ETH`);
            logger_1.logger.info(`  -> Transaction: https://sepolia.etherscan.io/tx/${event.transactionHash}`);
        });
    }
    /**
     * Mint an NFT for the given wallet. In CreatorVault contract, this is equivalent
     * to creating a new vault which also mints an ERC-721 to the owner.
     */
    async mintNft(toWallet) {
        if (this.hasDirectMint) {
            try {
                const tx = await this.registryContract.mint(toWallet);
                const receipt = await tx.wait(1);
                for (const log of receipt.logs) {
                    try {
                        const parsed = this.registryContract.interface.parseLog(log);
                        if (parsed && parsed.name === 'Transfer') {
                            const tokenId = parsed.args.tokenId;
                            return tokenId;
                        }
                    }
                    catch { }
                }
                throw new Error('Mint succeeded but Transfer not found');
            }
            catch (e) {
                // Fallback to createVault
                return this.createVaultForUser(toWallet);
            }
        }
        return this.createVaultForUser(toWallet);
    }
    /** Get owner of a given tokenId (vaultId). */
    async ownerOf(tokenId) {
        const id = BigInt(tokenId);
        return this.registryContract.ownerOf(id);
    }
    /** Get tokenURI for a given tokenId (vaultId). */
    async getTokenUri(tokenId) {
        const id = BigInt(tokenId);
        return this.registryContract.tokenURI(id);
    }
    /** Derive owned tokenIds for an owner by scanning Transfer events. */
    async getTokensByOwner(owner) {
        const fromBlock = environment_1.env.blockchain.deployFromBlock ?? 0;
        const toBlock = 'latest';
        const evt = this.registryContract.interface.getEvent('Transfer');
        if (!evt)
            throw new Error('Transfer event not found in ABI');
        const topicTransfer = evt.topicHash;
        // Build topics for from=owner and to=owner
        const topicsTo = [topicTransfer, null, ethers_1.ethers.zeroPadValue(owner, 32)];
        const topicsFrom = [topicTransfer, ethers_1.ethers.zeroPadValue(owner, 32), null];
        const [logsTo, logsFrom] = await Promise.all([
            this.provider.getLogs({ address: this.registryContract.target, fromBlock, toBlock, topics: topicsTo }),
            this.provider.getLogs({ address: this.registryContract.target, fromBlock, toBlock, topics: topicsFrom }),
        ]);
        const owned = new Set();
        for (const log of logsTo) {
            const parsed = this.registryContract.interface.parseLog(log);
            const tokenId = parsed.args.tokenId;
            owned.add(tokenId);
        }
        for (const log of logsFrom) {
            const parsed = this.registryContract.interface.parseLog(log);
            const tokenId = parsed.args.tokenId;
            owned.delete(tokenId);
        }
        return [...owned];
    }
    /** Faster owner lookup via DB index if available. */
    async getTokensByOwnerIndexed(owner) {
        const prismaAny = prisma_1.prisma;
        if (!prismaAny.nftToken)
            return [];
        const items = await prismaAny.nftToken.findMany({ where: { ownerAddress: owner.toLowerCase() }, orderBy: { tokenId: 'asc' } });
        return items.map((i) => ({ tokenId: i.tokenId.toString(), tokenURI: i.tokenURI || undefined }));
    }
    /** Resolve token metadata JSON using IPFS gateway. */
    async fetchTokenMetadata(tokenURI) {
        const url = tokenURI.startsWith('ipfs://') ? `${environment_1.env.ipfsGateway}/ipfs/${tokenURI.replace('ipfs://', '')}` : tokenURI;
        try {
            const res = await fetch(url);
            if (!res.ok)
                return null;
            return await res.json();
        }
        catch {
            return null;
        }
    }
}
exports.blockchainService = new BlockchainService();
//# sourceMappingURL=blockchain.service.js.map