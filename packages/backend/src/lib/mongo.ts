import mongoose, { Schema, model, models } from 'mongoose';
import { env } from '../config/environment';
import { PayoutStatus, StreamStatus, TransactionStatus, TransactionType, UserRole } from '../types/models';

let connected = false;
export async function connectMongo() {
  if (connected) return mongoose.connection;
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.databaseUrl);
  connected = true;
  return mongoose.connection;
}

const userSchema = new Schema({
  email: { type: String, unique: true, sparse: true },
  password: String,
  name: String,
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

export const UserModel = models.User || model('User', userSchema);
export const StreamModel = models.Stream || model('Stream', streamSchema);
export const TransactionModel = models.Transaction || model('Transaction', transactionSchema);
export const PayoutRequestModel = models.PayoutRequest || model('PayoutRequest', payoutSchema);
export const NotificationModel = models.Notification || model('Notification', notificationSchema);
export const ChatMessageModel = models.ChatMessage || model('ChatMessage', chatMessageSchema);
export const MuteModel = models.Mute || model('Mute', muteSchema);
export const BalanceModel = models.Balance || model('Balance', balanceSchema);
export const NftTokenModel = models.NftToken || model('NftToken', nftTokenSchema);
export const NftSyncStateModel = models.NftSyncState || model('NftSyncState', nftSyncStateSchema);
