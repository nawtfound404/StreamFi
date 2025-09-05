"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHls = exports.getStreamStatus = exports.getIngest = void 0;
const mongo_1 = require("../../lib/mongo");
const environment_1 = require("../../config/environment");
const crypto_1 = __importDefault(require("crypto"));
const mongoose_1 = require("mongoose");
const getIngest = async (req, res) => {
    // Issue or reuse a stream key for the authenticated streamer
    const userId = req.user?.id;
    if (!userId)
        return res.status(401).json({ message: 'Unauthorized' });
    // Double-check ban status (in case of stale tokens)
    await (0, mongo_1.connectMongo)();
    const user = await mongo_1.UserModel.findById(userId).lean();
    if (!user || user.banned)
        return res.status(403).json({ message: 'Account banned' });
    // Reuse existing active stream or create one
    let stream = await mongo_1.StreamModel.findOne({ streamerId: new mongoose_1.Types.ObjectId(userId) }).lean();
    if (!stream) {
        const created = await mongo_1.StreamModel.create({ title: 'My Stream', streamerId: new mongoose_1.Types.ObjectId(userId), status: 'IDLE' });
        stream = created.toObject();
    }
    let streamKey = stream.streamKey;
    if (!streamKey) {
        streamKey = crypto_1.default.randomBytes(12).toString('hex');
        await mongo_1.StreamModel.updateOne({ _id: stream._id }, { $set: { streamKey, ingestUrl: environment_1.env.nms.rtmpUrl } });
    }
    return res.status(200).json({ ingestUrl: environment_1.env.nms.rtmpUrl, streamKey, status: String(stream.status || 'IDLE').toLowerCase() });
};
exports.getIngest = getIngest;
const getStreamStatus = (req, res) => res.status(200).json({ id: req.params.id, status: 'live', viewers: 123, startedAt: new Date() });
exports.getStreamStatus = getStreamStatus;
const getHls = async (req, res) => {
    // Accept either stream id or stream key
    const idOrKey = req.params.id;
    await (0, mongo_1.connectMongo)();
    const byId = mongoose_1.Types.ObjectId.isValid(idOrKey) ? await mongo_1.StreamModel.findById(idOrKey).lean() : null;
    const stream = byId || (await mongo_1.StreamModel.findOne({ streamKey: idOrKey }).lean());
    if (!stream)
        return res.status(404).json({ message: 'Stream not found' });
    const keyForUrl = stream?.streamKey ?? idOrKey;
    const path = environment_1.env.nms.hlsTemplate.replace('{key}', keyForUrl);
    const url = `${environment_1.env.nms.hlsBase}${path}`;
    if (req.query.redirect)
        return res.redirect(302, url);
    return res.status(200).json({ hlsUrl: url });
};
exports.getHls = getHls;
//# sourceMappingURL=stream.controller.js.map