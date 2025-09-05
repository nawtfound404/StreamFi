import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectMongo, UserModel, StreamModel, ReactionModel } from '../lib/mongo';
import { UserRole, StreamStatus } from '../types/models';

async function upsertUser(email: string, password: string, role: UserRole, name?: string) {
  const existing = await UserModel.findOne({ email });
  if (existing) {
    if (existing.role !== role) {
      existing.role = role;
      await existing.save();
    }
    return existing;
  }
  const hash = await bcrypt.hash(password, 10);
  return UserModel.create({ email, password: hash, role, name });
}

async function upsertStream(streamerId: mongoose.Types.ObjectId, title: string) {
  const found = await StreamModel.findOne({ streamerId, title });
  if (found) return found;
  return StreamModel.create({
    title,
    streamerId,
    status: StreamStatus.IDLE,
  });
}

async function upsertReaction(streamerId: mongoose.Types.ObjectId, key: string, label: string, priceInPaise: number) {
  await ReactionModel.findOneAndUpdate(
    { streamerId, key },
    { $set: { label, priceInPaise } },
    { upsert: true }
  );
}

async function main() {
  await connectMongo();

  const admin = await upsertUser('admin@streamfi.local', 'admin123', UserRole.ADMIN, 'Admin');
  const streamer = await upsertUser('creator@streamfi.local', 'creator123', UserRole.STREAMER, 'Creator');

  const stream = await upsertStream(streamer._id as mongoose.Types.ObjectId, 'My First Stream');

  await Promise.all([
    upsertReaction(streamer._id as mongoose.Types.ObjectId, 'like', 'Like', 100),
    upsertReaction(streamer._id as mongoose.Types.ObjectId, 'haha', 'Haha', 200),
    upsertReaction(streamer._id as mongoose.Types.ObjectId, 'wow', 'Wow', 500),
  ]);

  // eslint-disable-next-line no-console
  console.log('Seed complete:', {
    admin: admin.email,
    streamer: streamer.email,
    streamId: (stream as any)._id?.toString?.(),
  });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
