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
        if (user?.vaultId) {
            return res.status(409).json({ message: 'User already has a vault' });
        }
        const newVaultId = await blockchain_service_1.blockchainService.createVaultForUser(walletAddress);
        await mongo_1.UserModel.updateOne({ _id: userId }, { $set: { walletAddress, ...(newVaultId ? { vaultId: newVaultId } : {}) } });
        const updatedUser = await mongo_1.UserModel.findById(userId).lean();
        res.status(201).json({
            message: 'Vault created successfully',
            vaultId: newVaultId?.toString(),
            user: updatedUser,
        });
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Vault creation controller error');
        res.status(500).json({ message: 'Failed to create vault' });
    }
};
exports.createVault = createVault;
//# sourceMappingURL=vault.controller.js.map