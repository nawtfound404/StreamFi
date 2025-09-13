import mongoose, { Schema, model, models } from 'mongoose';
import { env } from '../config/environment';
import { PayoutStatus, StreamStatus, TransactionStatus, TransactionType, UserRole } from '../types/models';
import { logger } from '../utils/logger';

let connected = false;
export async function connectMongo(retries = 5) {
  if (connected) return mongoose.connection;
  mongoose.set('strictQuery', true);
  let attempt = 0;
  const baseDelay = 500; // ms
  const hasDbInUri = /mongodb(\+srv)?:\/\/[^/]+\/([^?]+)/.test(env.databaseUrl);
  while (!connected && attempt <= retries) {
    attempt++;
    try {
      if (attempt === 1) logger.info('🗄️  Connecting to MongoDB...');
      else logger.warn(`🔁 MongoDB reconnect attempt ${attempt}/${retries}`);
      const opts: any = {
        serverSelectionTimeoutMS: 6000,
        maxPoolSize: 10,
      };
      if (!hasDbInUri && env.mongoDbName) {
        opts.dbName = env.mongoDbName;
        logger.info(`📁 Using dbName override '${env.mongoDbName}' (not present in URI)`);
      }
      await mongoose.connect(env.databaseUrl, opts);
      connected = true;
      logger.info('✅ MongoDB connected');
      break;
    } catch (err: any) {
      if (err?.message?.includes('Authentication failed')) {
        logger.error({ err: err.message }, '❌ MongoDB authentication failed. Check DATABASE_URL credentials vs docker-compose MONGO_INITDB_* values.');
        throw err; // Auth errors won't fix with retries
      }
      if (err?.name === 'MongooseServerSelectionError') {
        logger.error({ reason: err.reason?.message }, '🌐 Mongo server selection failed (network/DNS/firewall). For Atlas ensure IP is whitelisted.');
      }
      if (attempt > retries) {
        logger.error({ err }, '❌ MongoDB connection failed after retries');
        throw err;
      }
      const delay = baseDelay * attempt;
      await new Promise(r => setTimeout(r, delay));
    }
  }
  return mongoose.connection;
}

// Add database health check function
export async function pingDatabase(): Promise<boolean> {
  try {
    await connectMongo();
  const db = mongoose.connection.db;
  if (!db) return false;
  await db.admin().command({ ping: 1 });
    return true;
  } catch (e) {
    console.error('MongoDB ping failed:', e);
    return false;
  }
}

const userSchema = new Schema({
  email: { type: String, unique: true, sparse: true },
  password: String,
  name: String,
  username: { type: String, unique: true, sparse: true, index: true },
  displayName: String,
  about: String,
  payoutEmail: String,
  googleId: { type: String, unique: true, sparse: true },
  role: { type: String, enum: Object.values(UserRole), default: UserRole.AUDIENCE },
  credits: { type: Number, default: 0 },
  banned: { type: Boolean, default: false },
  bannedAt: Date,
  banReason: String,
  walletAddress: { type: String, unique: true, sparse: true },
  vaultId: { type: Schema.Types.Mixed, unique: true, sparse: true },
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

const streamSchema = new Schema({
  title: { type: String, required: true },
  ingestUrl: String,
  streamKey: { type: String, unique: true, sparse: true },
  status: { type: String, enum: Object.values(StreamStatus), default: StreamStatus.IDLE },
  streamerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  monetizationRules: Schema.Types.Mixed,
  startedAt: Date,
  endedAt: Date,
  viewers: { type: Number, default: 0 },
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } });

const transactionSchema = new Schema({
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  type: { type: String, enum: Object.values(TransactionType), required: true },
  status: { type: String, enum: Object.values(TransactionStatus), required: true },
  provider: String,
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  streamId: { type: Schema.Types.ObjectId, ref: 'Stream' },
  metadata: Schema.Types.Mixed,
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } });

const payoutSchema = new Schema({
  streamerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  status: { type: String, enum: Object.values(PayoutStatus), default: PayoutStatus.PENDING },
  note: String,
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

const notificationSchema = new Schema({
  type: String,
  title: String,
  body: String,
  read: { type: Boolean, default: false },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } });

const chatMessageSchema = new Schema({
  streamId: { type: Schema.Types.ObjectId, ref: 'Stream', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  text: { type: String, required: true },
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } });

const muteSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
  reason: String,
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } });

// Streamer-defined reaction catalog (custom reactions with pricing in paise)
const reactionSchema = new Schema({
  streamerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  key: { type: String, required: true },
  label: { type: String, required: true },
  priceInPaise: { type: Number, required: true, min: 0 },
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });
reactionSchema.index({ streamerId: 1, key: 1 }, { unique: true });

// Per-stream wallet token escrow tracking (off-chain accounting)
const balanceSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  streamId: { type: Schema.Types.ObjectId, ref: 'Stream', required: true, index: true },
  deposited: { type: Number, default: 0 },
  spent: { type: Number, default: 0 },
  token: { type: String, default: 'NATIVE' },
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

const nftTokenSchema = new Schema({
  tokenId: { type: Schema.Types.Mixed, index: { unique: true } },
  ownerAddress: { type: String, index: true },
  tokenURI: String,
}, { timestamps: { updatedAt: 'updatedAt', createdAt: false } });

const nftSyncStateSchema = new Schema({
  _id: { type: String, default: 'nitrolite' },
  lastBlock: { type: Schema.Types.Mixed, default: 0 },
}, { timestamps: { updatedAt: 'updatedAt', createdAt: false } });

// Off-chain microtransaction channel state
const channelSchema = new Schema({
  channelId: { type: String, unique: true, index: true },
  streamId: { type: Schema.Types.ObjectId, ref: 'Stream', index: true },
  viewerAddress: { type: String, index: true },
  streamerUserId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  streamerVaultId: { type: Schema.Types.Mixed },
  depositWei: { type: String, required: true },
  spentWei: { type: String, default: '0' },
  nonce: { type: Number, default: 0 },
  status: { type: String, enum: ['OPEN','CLOSING','CLOSED'], default: 'OPEN', index: true },
  openTxHash: { type: String },
  closeTxHash: { type: String },
  lastSig: { type: String },
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

export const UserModel = models.User || model('User', userSchema);
export const StreamModel = models.Stream || model('Stream', streamSchema);
export const TransactionModel = models.Transaction || model('Transaction', transactionSchema);
export const PayoutRequestModel = models.PayoutRequest || model('PayoutRequest', payoutSchema);
export const NotificationModel = models.Notification || model('Notification', notificationSchema);
export const ChatMessageModel = models.ChatMessage || model('ChatMessage', chatMessageSchema);
export const MuteModel = models.Mute || model('Mute', muteSchema);
export const ReactionModel = models.Reaction || model('Reaction', reactionSchema);
export const BalanceModel = models.Balance || model('Balance', balanceSchema);
export const NftTokenModel = models.NftToken || model('NftToken', nftTokenSchema);
export const NftSyncStateModel = models.NftSyncState || model('NftSyncState', nftSyncStateSchema);
export const ChannelModel = models.Channel || model('Channel', channelSchema);
