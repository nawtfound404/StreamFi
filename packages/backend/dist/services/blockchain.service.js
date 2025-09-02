"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.blockchainService = void 0;
const ethers_1 = require("ethers");
const environment_1 = require("../config/environment");
const logger_1 = require("../utils/logger");
const Nitrolite_json_1 = __importDefault(require("./abi/Nitrolite.json"));
class BlockchainService {
    provider;
    registryContract;
    adminWallet;
    constructor() {
        this.provider = new ethers_1.ethers.JsonRpcProvider(environment_1.env.blockchain.rpcProvider);
        this.adminWallet = new ethers_1.ethers.Wallet(environment_1.env.blockchain.adminPrivateKey, this.provider);
        this.registryContract = new ethers_1.ethers.Contract(environment_1.env.blockchain.creatorVaultAddress, Nitrolite_json_1.default.abi, this.adminWallet);
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
}
exports.blockchainService = new BlockchainService();
//# sourceMappingURL=blockchain.service.js.map