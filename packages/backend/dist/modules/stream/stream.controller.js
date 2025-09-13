"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stopStream = exports.startStream = exports.getHls = exports.getStreamStatus = exports.getIngest = void 0;
const mongo_1 = require("../../lib/mongo");
const environment_1 = require("../../config/environment");
const crypto_1 = __importDefault(require("crypto"));
const mongoose_1 = require("mongoose");
const socket_1 = require("../../lib/socket");
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
    return res.status(200).json({
        ingestUrl: environment_1.env.nms.rtmpUrl,
        streamKey,
        streamId: String(stream._id),
        status: String(stream.status || 'IDLE').toLowerCase(),
    });
};
exports.getIngest = getIngest;
const getStreamStatus = async (req, res) => {
    try {
        const idOrKey = req.params.id;
        await (0, mongo_1.connectMongo)();
        const byId = mongoose_1.Types.ObjectId.isValid(idOrKey) ? await mongo_1.StreamModel.findById(idOrKey).lean() : null;
        const stream = byId || (await mongo_1.StreamModel.findOne({ streamKey: idOrKey }).lean());
        if (!stream)
            return res.status(404).json({ message: 'Stream not found' });
        const id = String(stream._id);
        const key = stream.streamKey;
        // Count both id and key rooms since clients may join either
        const viewers = (0, socket_1.getRoomSize)(id) + (key && key !== id ? (0, socket_1.getRoomSize)(key) : 0);
        return res.status(200).json({
            id,
            status: stream.status || 'IDLE',
            viewers,
            startedAt: stream.startedAt || null,
        });
    }
    catch (e) {
        return res.status(500).json({ message: 'Failed to fetch status' });
    }
};
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
/** Manually mark a stream LIVE (UI toggle). Does not start media; RTMP publish still needed for video. */
const startStream = async (req, res) => {
    try {
        const idOrKey = req.params.id;
        const uid = req.user?.id;
        if (!uid)
            return res.status(401).json({ message: 'Unauthorized' });
        await (0, mongo_1.connectMongo)();
        const byId = mongoose_1.Types.ObjectId.isValid(idOrKey) ? await mongo_1.StreamModel.findById(idOrKey) : null;
        const streamDoc = byId || (await mongo_1.StreamModel.findOne({ streamKey: idOrKey }));
        if (!streamDoc)
            return res.status(404).json({ message: 'Stream not found' });
        // Ownership check
        if (String(streamDoc.streamerId) !== String(uid))
            return res.status(403).json({ message: 'Forbidden' });
        streamDoc.set({ status: 'LIVE', startedAt: new Date() });
        await streamDoc.save();
        (0, socket_1.emitToStreamRooms)({ id: String(streamDoc._id), key: streamDoc.streamKey }, 'stream_status', { status: 'LIVE' });
        return res.json({ ok: true, status: 'LIVE' });
    }
    catch {
        return res.status(500).json({ message: 'Failed to start stream' });
    }
};
exports.startStream = startStream;
/** Manually mark a stream IDLE (UI toggle). Will also set endedAt. */
const stopStream = async (req, res) => {
    try {
        const idOrKey = req.params.id;
        const uid = req.user?.id;
        if (!uid)
            return res.status(401).json({ message: 'Unauthorized' });
        await (0, mongo_1.connectMongo)();
        const byId = mongoose_1.Types.ObjectId.isValid(idOrKey) ? await mongo_1.StreamModel.findById(idOrKey) : null;
        const streamDoc = byId || (await mongo_1.StreamModel.findOne({ streamKey: idOrKey }));
        if (!streamDoc)
            return res.status(404).json({ message: 'Stream not found' });
        if (String(streamDoc.streamerId) !== String(uid))
            return res.status(403).json({ message: 'Forbidden' });
        streamDoc.set({ status: 'IDLE', endedAt: new Date() });
        await streamDoc.save();
        (0, socket_1.emitToStreamRooms)({ id: String(streamDoc._id), key: streamDoc.streamKey }, 'stream_status', { status: 'IDLE' });
        return res.json({ ok: true, status: 'IDLE' });
    }
    catch {
        return res.status(500).json({ message: 'Failed to stop stream' });
    }
};
exports.stopStream = stopStream;
//# sourceMappingURL=stream.controller.js.map