"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createVault = void 0;
const mongo_1 = require("../../lib/mongo");
const blockchain_service_1 = require("../../services/blockchain.service");
const logger_1 = require("../../utils/logger");
const createVault = async (req, res) => {
    const userId = req.user?.id;
    const { walletAddress } = req.body;
    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    if (!walletAddress || !walletAddress.startsWith('0x')) {
        return res.status(400).json({ message: 'Valid walletAddress is required' });
    }
    try {
        await (0, mongo_1.connectMongo)();
        const user = await mongo_1.UserModel.findById(userId).lean();
        // If user already has a vault, allow updating walletAddress idempotently
        if (user?.vaultId) {
            // If wallet changed, update it; else no-op
            const needsUpdate = String(user?.walletAddress || '').toLowerCase() !== String(walletAddress).toLowerCase();
            if (needsUpdate) {
                try {
                    await mongo_1.UserModel.updateOne({ _id: userId }, { $set: { walletAddress } });
                }
                catch (e) {
                    if (e?.code === 11000) {
                        return res.status(409).json({ message: 'Wallet address already in use' });
                    }
                    throw e;
                }
            }
            const updatedUser = await mongo_1.UserModel.findById(userId).lean();
            return res.status(200).json({
                message: needsUpdate ? 'Vault exists; wallet updated' : 'Vault already exists',
                vaultId: String(updatedUser?.vaultId ?? ''),
                user: updatedUser,
                created: false,
            });
        }
        // Try to discover an existing vault on-chain for this owner
        try {
            const owned = await blockchain_service_1.blockchainService.getTokensByOwner(walletAddress);
            if (owned && owned.length > 0) {
                const attachId = owned[0];
                await mongo_1.UserModel.updateOne({ _id: userId }, { $set: { walletAddress, vaultId: attachId.toString() } });
                const updatedUser = await mongo_1.UserModel.findById(userId).lean();
                return res.status(200).json({ message: 'Attached existing vault', vaultId: attachId.toString(), user: updatedUser, created: false });
            }
        }
        catch (e) {
            // Non-fatal; fall through to attempt mint/createVault
        }
        const newVaultId = await blockchain_service_1.blockchainService.createVaultForUser(walletAddress);
        await mongo_1.UserModel.updateOne({ _id: userId }, { $set: { walletAddress, ...(newVaultId ? { vaultId: newVaultId } : {}) } });
        const updatedUser = await mongo_1.UserModel.findById(userId).lean();
        res.status(201).json({
            message: 'Vault created successfully',
            vaultId: newVaultId?.toString(),
            user: updatedUser,
            created: true,
        });
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Vault creation controller error');
        res.status(500).json({ message: 'Failed to create vault' });
    }
};
exports.createVault = createVault;
//# sourceMappingURL=vault.controller.js.map