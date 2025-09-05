"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const mongo_1 = require("../lib/mongo");
const models_1 = require("../types/models");
async function upsertUser(email, password, role, name) {
    const existing = await mongo_1.UserModel.findOne({ email });
    if (existing) {
        if (existing.role !== role) {
            existing.role = role;
            await existing.save();
        }
        return existing;
    }
    const hash = await bcryptjs_1.default.hash(password, 10);
    return mongo_1.UserModel.create({ email, password: hash, role, name });
}
async function upsertStream(streamerId, title) {
    const found = await mongo_1.StreamModel.findOne({ streamerId, title });
    if (found)
        return found;
    return mongo_1.StreamModel.create({
        title,
        streamerId,
        status: models_1.StreamStatus.IDLE,
    });
}
async function upsertReaction(streamerId, key, label, priceInPaise) {
    await mongo_1.ReactionModel.findOneAndUpdate({ streamerId, key }, { $set: { label, priceInPaise } }, { upsert: true });
}
async function main() {
    await (0, mongo_1.connectMongo)();
    const admin = await upsertUser('admin@streamfi.local', 'admin123', models_1.UserRole.ADMIN, 'Admin');
    const streamer = await upsertUser('creator@streamfi.local', 'creator123', models_1.UserRole.STREAMER, 'Creator');
    const stream = await upsertStream(streamer._id, 'My First Stream');
    await Promise.all([
        upsertReaction(streamer._id, 'like', 'Like', 100),
        upsertReaction(streamer._id, 'haha', 'Haha', 200),
        upsertReaction(streamer._id, 'wow', 'Wow', 500),
    ]);
    // eslint-disable-next-line no-console
    console.log('Seed complete:', {
        admin: admin.email,
        streamer: streamer.email,
        streamId: stream._id?.toString?.(),
    });
}
main()
    .then(() => process.exit(0))
    .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=seed.js.map