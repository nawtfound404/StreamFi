"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.channelTypes = exports.channelDomain = void 0;
exports.generateChannelId = generateChannelId;
exports.openChannel = openChannel;
exports.verifyAndApplyTip = verifyAndApplyTip;
exports.closeChannelCooperative = closeChannelCooperative;
const ethers_1 = require("ethers");
const environment_1 = require("../config/environment");
const mongo_1 = require("../lib/mongo");
const blockchain_service_1 = require("./blockchain.service");
// EIP-712 domain & types for channel state
const channelDomain = () => ({
    name: 'StreamFiChannel',
    version: '1',
    chainId: environment_1.env.yellow.chainId,
    verifyingContract: environment_1.env.yellow.channelContract,
});
exports.channelDomain = channelDomain;
exports.channelTypes = {
    ChannelState: [
        { name: 'channelId', type: 'bytes32' },
        { name: 'vaultId', type: 'uint256' },
        { name: 'viewer', type: 'address' },
        { name: 'deposit', type: 'uint256' },
        { name: 'spent', type: 'uint256' },
        { name: 'nonce', type: 'uint64' },
    ],
};
function generateChannelId(viewer, streamId, vaultId) {
    const preimage = ethers_1.ethers.solidityPacked(['address', 'bytes32', 'uint256'], [viewer.toLowerCase(), ethers_1.ethers.id(streamId), vaultId]);
    return ethers_1.ethers.keccak256(preimage);
}
async function openChannel(params) {
    await (0, mongo_1.connectMongo)();
    const stream = await mongo_1.StreamModel.findById(params.streamId).lean();
    if (!stream)
        throw new Error('Stream not found');
    const streamer = await mongo_1.UserModel.findById(stream.streamerId).lean();
    if (!streamer)
        throw new Error('Streamer not found');
    if (!streamer.vaultId)
        throw new Error('Streamer has no vault');
    const vaultId = BigInt(streamer.vaultId);
    const channelId = generateChannelId(params.viewer, params.streamId, vaultId);
    const existing = await mongo_1.ChannelModel.findOne({ channelId }).lean();
    if (existing) {
        // If an existing channel is not OPEN (e.g., CLOSED/CLOSING), "re-open" it by resetting state.
        if (existing.status !== 'OPEN') {
            await mongo_1.ChannelModel.updateOne({ channelId }, {
                $set: {
                    status: 'OPEN',
                    depositWei: params.depositWei.toString(),
                    spentWei: '0',
                    nonce: 0,
                },
                $unset: { lastSig: "" },
            });
            return { channelId, reused: false, record: { ...existing, streamerVaultId: streamer.vaultId } };
        }
        return { reused: true, channelId };
    }
    const doc = await mongo_1.ChannelModel.create({
        channelId,
        streamId: params.streamId,
        viewerAddress: params.viewer.toLowerCase(),
        streamerUserId: streamer?._id,
        streamerVaultId: streamer.vaultId,
        depositWei: params.depositWei.toString(),
        spentWei: '0',
        nonce: 0,
        status: 'OPEN',
    });
    return { channelId, reused: false, record: doc.toObject() };
}
async function verifyAndApplyTip(payload) {
    await (0, mongo_1.connectMongo)();
    const channel = await mongo_1.ChannelModel.findOne({ channelId: payload.channelId }).lean();
    if (!channel)
        throw new Error('Channel not found');
    if (channel.status !== 'OPEN')
        throw new Error('Channel not open');
    if (channel.viewerAddress.toLowerCase() !== payload.viewer.toLowerCase())
        throw new Error('Viewer mismatch');
    const deposit = BigInt(channel.depositWei);
    const prevSpent = BigInt(channel.spentWei);
    const newSpent = BigInt(payload.newSpentWei);
    if (newSpent <= prevSpent)
        throw new Error('Non-incremental spent');
    const tip = newSpent - prevSpent;
    if (tip < BigInt(environment_1.env.yellow.minTipWei))
        throw new Error('Tip below minimum');
    if (newSpent > deposit)
        throw new Error('Exceeds deposit');
    if (payload.nonce !== channel.nonce + 1)
        throw new Error('Bad nonce');
    // Reconstruct signed state
    const vaultId = BigInt(channel.streamerVaultId);
    const state = {
        channelId: channel.channelId,
        vaultId,
        viewer: channel.viewerAddress,
        deposit,
        spent: newSpent,
        nonce: BigInt(payload.nonce),
    };
    // Cast channelTypes to mutable structure acceptable by ethers
    const mutableTypes = {
        ChannelState: exports.channelTypes.ChannelState.map(f => ({ ...f })),
    };
    const recovered = ethers_1.ethers.verifyTypedData((0, exports.channelDomain)(), mutableTypes, state, payload.signature);
    if (recovered.toLowerCase() !== channel.viewerAddress.toLowerCase())
        throw new Error('Bad signature');
    await mongo_1.ChannelModel.updateOne({ channelId: channel.channelId }, { $set: { spentWei: newSpent.toString(), nonce: payload.nonce, lastSig: payload.signature } });
    return { tipWei: tip.toString(), newSpentWei: newSpent.toString(), nonce: payload.nonce };
}
async function closeChannelCooperative(channelId) {
    await (0, mongo_1.connectMongo)();
    const channel = await mongo_1.ChannelModel.findOne({ channelId }).lean();
    if (!channel)
        throw new Error('Channel not found');
    if (channel.status !== 'OPEN')
        throw new Error('Already closing/closed');
    // Set status to CLOSING during settlement
    await mongo_1.ChannelModel.updateOne({ channelId }, { $set: { status: 'CLOSING' } });
    const spent = BigInt(channel.spentWei || '0');
    const vaultId = BigInt(channel.streamerVaultId);
    let depositTx = null;
    if (spent > 0n) {
        try {
            depositTx = await blockchain_service_1.blockchainService.depositToVault(vaultId, spent);
        }
        catch (e) {
            // In non-production, allow closing off-chain even if on-chain deposit fails
            if (process.env.NODE_ENV !== 'production') {
                depositTx = null;
            }
            else {
                await mongo_1.ChannelModel.updateOne({ channelId }, { $set: { status: 'OPEN' } });
                throw e;
            }
        }
    }
    await mongo_1.ChannelModel.updateOne({ channelId }, { $set: { status: 'CLOSED', closeTxHash: depositTx } });
    return { ok: true, channelId, deposited: spent.toString(), vaultId: vaultId.toString(), depositTxHash: depositTx };
}
//# sourceMappingURL=channel.service.js.map