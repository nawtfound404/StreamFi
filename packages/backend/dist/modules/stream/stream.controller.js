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
const mongo_2 = require("../../lib/mongo");
const channel_service_1 = require("../../services/channel.service");
const yellow_service_1 = require("../../services/yellow.service");
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
    const forceNew = String(req.query.new || '').trim() === '1';
    // Reuse existing active stream or create one (allow forced creation via ?new=1)
    let stream = null;
    if (!forceNew) {
        stream = await mongo_1.StreamModel.findOne({ streamerId: new mongoose_1.Types.ObjectId(userId) }).lean();
    }
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
        // Auto-close all channels for this stream (settle microtransactions to creator vault)
        try {
            const sid = String(streamDoc._id);
            const openChannels = await mongo_2.ChannelModel.find({ streamId: sid, status: { $in: ['OPEN', 'CLOSING'] } }).lean();
            let closed = 0;
            for (const ch of openChannels) {
                try {
                    // Cooperative close (includes deposit to vault and marks CLOSED)
                    await (0, channel_service_1.closeChannelCooperative)(ch.channelId);
                    closed++;
                    // If the channel was opened on-chain (openTxHash present), attempt on-chain close as well
                    if (ch.openTxHash) {
                        const spent = BigInt(ch.spentWei || '0');
                        try {
                            await yellow_service_1.yellowService.closeChannel(ch.channelId, spent);
                        }
                        catch { /* non-fatal in stop */ }
                    }
                }
                catch { /* continue with next channel */ }
            }
            return res.json({ ok: true, status: 'IDLE', channelsClosed: closed });
        }
        catch {
            // If settlement fails, still return success for stopping stream
            return res.json({ ok: true, status: 'IDLE', channelsClosed: 0 });
        }
    }
    catch {
        return res.status(500).json({ message: 'Failed to stop stream' });
    }
};
exports.stopStream = stopStream;
//# sourceMappingURL=stream.controller.js.map