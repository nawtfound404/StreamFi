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
exports.ChannelModel = exports.NftSyncStateModel = exports.NftTokenModel = exports.BalanceModel = exports.ReactionModel = exports.MuteModel = exports.ChatMessageModel = exports.NotificationModel = exports.PayoutRequestModel = exports.TransactionModel = exports.StreamModel = exports.UserModel = void 0;
exports.connectMongo = connectMongo;
exports.pingDatabase = pingDatabase;
const mongoose_1 = __importStar(require("mongoose"));
const environment_1 = require("../config/environment");
const models_1 = require("../types/models");
const logger_1 = require("../utils/logger");
let connected = false;
async function connectMongo(retries = 5) {
    if (connected)
        return mongoose_1.default.connection;
    mongoose_1.default.set('strictQuery', true);
    let attempt = 0;
    const baseDelay = 500; // ms
    const hasDbInUri = /mongodb(\+srv)?:\/\/[^/]+\/([^?]+)/.test(environment_1.env.databaseUrl);
    while (!connected && attempt <= retries) {
        attempt++;
        try {
            if (attempt === 1)
                logger_1.logger.info('🗄️  Connecting to MongoDB...');
            else
                logger_1.logger.warn(`🔁 MongoDB reconnect attempt ${attempt}/${retries}`);
            const opts = {
                serverSelectionTimeoutMS: 6000,
                maxPoolSize: 10,
            };
            if (!hasDbInUri && environment_1.env.mongoDbName) {
                opts.dbName = environment_1.env.mongoDbName;
                logger_1.logger.info(`📁 Using dbName override '${environment_1.env.mongoDbName}' (not present in URI)`);
            }
            await mongoose_1.default.connect(environment_1.env.databaseUrl, opts);
            connected = true;
            logger_1.logger.info('✅ MongoDB connected');
            break;
        }
        catch (err) {
            if (err?.message?.includes('Authentication failed')) {
                logger_1.logger.error({ err: err.message }, '❌ MongoDB authentication failed. Check DATABASE_URL credentials vs docker-compose MONGO_INITDB_* values.');
                throw err; // Auth errors won't fix with retries
            }
            if (err?.name === 'MongooseServerSelectionError') {
                logger_1.logger.error({ reason: err.reason?.message }, '🌐 Mongo server selection failed (network/DNS/firewall). For Atlas ensure IP is whitelisted.');
            }
            if (attempt > retries) {
                logger_1.logger.error({ err }, '❌ MongoDB connection failed after retries');
                throw err;
            }
            const delay = baseDelay * attempt;
            await new Promise(r => setTimeout(r, delay));
        }
    }
    return mongoose_1.default.connection;
}
// Add database health check function
async function pingDatabase() {
    try {
        await connectMongo();
        const db = mongoose_1.default.connection.db;
        if (!db)
            return false;
        await db.admin().command({ ping: 1 });
        return true;
    }
    catch (e) {
        console.error('MongoDB ping failed:', e);
        return false;
    }
}
const userSchema = new mongoose_1.Schema({
    email: { type: String, unique: true, sparse: true },
    password: String,
    name: String,
    username: { type: String, unique: true, sparse: true, index: true },
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
    viewers: { type: Number, default: 0 },
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
// Streamer-defined reaction catalog (custom reactions with pricing in paise)
const reactionSchema = new mongoose_1.Schema({
    streamerId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    key: { type: String, required: true },
    label: { type: String, required: true },
    priceInPaise: { type: Number, required: true, min: 0 },
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });
reactionSchema.index({ streamerId: 1, key: 1 }, { unique: true });
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
// Off-chain microtransaction channel state
const channelSchema = new mongoose_1.Schema({
    channelId: { type: String, unique: true, index: true },
    streamId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Stream', index: true },
    viewerAddress: { type: String, index: true },
    streamerUserId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', index: true },
    streamerVaultId: { type: mongoose_1.Schema.Types.Mixed },
    depositWei: { type: String, required: true },
    spentWei: { type: String, default: '0' },
    nonce: { type: Number, default: 0 },
    status: { type: String, enum: ['OPEN', 'CLOSING', 'CLOSED'], default: 'OPEN', index: true },
    openTxHash: { type: String },
    closeTxHash: { type: String },
    lastSig: { type: String },
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });
exports.UserModel = mongoose_1.models.User || (0, mongoose_1.model)('User', userSchema);
exports.StreamModel = mongoose_1.models.Stream || (0, mongoose_1.model)('Stream', streamSchema);
exports.TransactionModel = mongoose_1.models.Transaction || (0, mongoose_1.model)('Transaction', transactionSchema);
exports.PayoutRequestModel = mongoose_1.models.PayoutRequest || (0, mongoose_1.model)('PayoutRequest', payoutSchema);
exports.NotificationModel = mongoose_1.models.Notification || (0, mongoose_1.model)('Notification', notificationSchema);
exports.ChatMessageModel = mongoose_1.models.ChatMessage || (0, mongoose_1.model)('ChatMessage', chatMessageSchema);
exports.MuteModel = mongoose_1.models.Mute || (0, mongoose_1.model)('Mute', muteSchema);
exports.ReactionModel = mongoose_1.models.Reaction || (0, mongoose_1.model)('Reaction', reactionSchema);
exports.BalanceModel = mongoose_1.models.Balance || (0, mongoose_1.model)('Balance', balanceSchema);
exports.NftTokenModel = mongoose_1.models.NftToken || (0, mongoose_1.model)('NftToken', nftTokenSchema);
exports.NftSyncStateModel = mongoose_1.models.NftSyncState || (0, mongoose_1.model)('NftSyncState', nftSyncStateSchema);
exports.ChannelModel = mongoose_1.models.Channel || (0, mongoose_1.model)('Channel', channelSchema);
//# sourceMappingURL=mongo.js.map