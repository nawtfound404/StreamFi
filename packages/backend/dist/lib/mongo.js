"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.NftSyncStateModel = exports.NftTokenModel = exports.BalanceModel = exports.MuteModel = exports.ChatMessageModel = exports.NotificationModel = exports.PayoutRequestModel = exports.TransactionModel = exports.StreamModel = exports.UserModel = void 0;
exports.connectMongo = connectMongo;
const mongoose_1 = __importStar(require("mongoose"));
const environment_1 = require("../config/environment");
const models_1 = require("../types/models");
let connected = false;
async function connectMongo() {
    if (connected)
        return mongoose_1.default.connection;
    mongoose_1.default.set('strictQuery', true);
    await mongoose_1.default.connect(environment_1.env.databaseUrl);
    connected = true;
    return mongoose_1.default.connection;
}
const userSchema = new mongoose_1.Schema({
    email: { type: String, unique: true, sparse: true },
    password: String,
    name: String,
    displayName: String,
    about: String,
    payoutEmail: String,
    googleId: { type: String, unique: true, sparse: true },
    role: { type: String, enum: Object.values(models_1.UserRole), default: models_1.UserRole.AUDIENCE },
    credits: { type: Number, default: 0 },
    banned: { type: Boolean, default: false },
    bannedAt: Date,
    banReason: String,
    walletAddress: { type: String, unique: true, sparse: true },
    vaultId: { type: mongoose_1.Schema.Types.Mixed, unique: true, sparse: true },
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });
const streamSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    ingestUrl: String,
    streamKey: { type: String, unique: true, sparse: true },
    status: { type: String, enum: Object.values(models_1.StreamStatus), default: models_1.StreamStatus.IDLE },
    streamerId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    monetizationRules: mongoose_1.Schema.Types.Mixed,
    startedAt: Date,
    endedAt: Date,
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } });
const transactionSchema = new mongoose_1.Schema({
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    type: { type: String, enum: Object.values(models_1.TransactionType), required: true },
    status: { type: String, enum: Object.values(models_1.TransactionStatus), required: true },
    provider: String,
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    streamId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Stream' },
    metadata: mongoose_1.Schema.Types.Mixed,
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } });
const payoutSchema = new mongoose_1.Schema({
    streamerId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    status: { type: String, enum: Object.values(models_1.PayoutStatus), default: models_1.PayoutStatus.PENDING },
    note: String,
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });
const notificationSchema = new mongoose_1.Schema({
    type: String,
    title: String,
    body: String,
    read: { type: Boolean, default: false },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } });
const chatMessageSchema = new mongoose_1.Schema({
    streamId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Stream', required: true },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    text: { type: String, required: true },
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } });
const muteSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
    reason: String,
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } });
// Per-stream wallet token escrow tracking (off-chain accounting)
const balanceSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    streamId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Stream', required: true, index: true },
    deposited: { type: Number, default: 0 },
    spent: { type: Number, default: 0 },
    token: { type: String, default: 'NATIVE' },
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });
const nftTokenSchema = new mongoose_1.Schema({
    tokenId: { type: mongoose_1.Schema.Types.Mixed, index: { unique: true } },
    ownerAddress: { type: String, index: true },
    tokenURI: String,
}, { timestamps: { updatedAt: 'updatedAt', createdAt: false } });
const nftSyncStateSchema = new mongoose_1.Schema({
    _id: { type: String, default: 'nitrolite' },
    lastBlock: { type: mongoose_1.Schema.Types.Mixed, default: 0 },
}, { timestamps: { updatedAt: 'updatedAt', createdAt: false } });
exports.UserModel = mongoose_1.models.User || (0, mongoose_1.model)('User', userSchema);
exports.StreamModel = mongoose_1.models.Stream || (0, mongoose_1.model)('Stream', streamSchema);
exports.TransactionModel = mongoose_1.models.Transaction || (0, mongoose_1.model)('Transaction', transactionSchema);
exports.PayoutRequestModel = mongoose_1.models.PayoutRequest || (0, mongoose_1.model)('PayoutRequest', payoutSchema);
exports.NotificationModel = mongoose_1.models.Notification || (0, mongoose_1.model)('Notification', notificationSchema);
exports.ChatMessageModel = mongoose_1.models.ChatMessage || (0, mongoose_1.model)('ChatMessage', chatMessageSchema);
exports.MuteModel = mongoose_1.models.Mute || (0, mongoose_1.model)('Mute', muteSchema);
exports.BalanceModel = mongoose_1.models.Balance || (0, mongoose_1.model)('Balance', balanceSchema);
exports.NftTokenModel = mongoose_1.models.NftToken || (0, mongoose_1.model)('NftToken', nftTokenSchema);
exports.NftSyncStateModel = mongoose_1.models.NftSyncState || (0, mongoose_1.model)('NftSyncState', nftSyncStateSchema);
//# sourceMappingURL=mongo.js.map