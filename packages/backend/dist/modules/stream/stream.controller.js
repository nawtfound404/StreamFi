"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHls = exports.getStreamStatus = exports.getIngest = void 0;
const prisma_1 = require("../../lib/prisma");
const environment_1 = require("../../config/environment");
const crypto_1 = __importDefault(require("crypto"));
const prisma_2 = require("../../lib/prisma");
const getIngest = async (req, res) => {
    // Issue or reuse a stream key for the authenticated streamer
    const userId = req.user?.id;
    if (!userId)
        return res.status(401).json({ message: 'Unauthorized' });
    // Double-check ban status (in case of stale tokens)
    const user = await prisma_2.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.banned)
        return res.status(403).json({ message: 'Account banned' });
    // Reuse existing active stream or create one
    let stream = await prisma_1.prisma.stream.findFirst({ where: { streamerId: userId } });
    if (!stream) {
        stream = await prisma_1.prisma.stream.create({ data: { title: 'My Stream', streamerId: userId, status: 'IDLE' } });
    }
    let streamKey = stream.streamKey;
    if (!streamKey) {
        streamKey = crypto_1.default.randomBytes(12).toString('hex');
        await prisma_1.prisma.stream.update({ where: { id: stream.id }, data: { streamKey, ingestUrl: environment_1.env.nms.rtmpUrl } });
    }
    return res.status(200).json({ ingestUrl: environment_1.env.nms.rtmpUrl, streamKey, status: stream.status.toLowerCase() });
};
exports.getIngest = getIngest;
const getStreamStatus = (req, res) => res.status(200).json({ id: req.params.id, status: 'live', viewers: 123, startedAt: new Date() });
exports.getStreamStatus = getStreamStatus;
const getHls = async (req, res) => {
    // Accept either stream id or stream key
    const idOrKey = req.params.id;
    const stream = await prisma_1.prisma.stream.findFirst({ where: { OR: [{ id: idOrKey }, { streamKey: idOrKey }] } });
    const keyForUrl = stream?.streamKey ?? idOrKey;
    const path = environment_1.env.nms.hlsTemplate.replace('{key}', keyForUrl);
    const url = `${environment_1.env.nms.hlsBase}${path}`;
    if (req.query.redirect)
        return res.redirect(302, url);
    return res.status(200).json({ hlsUrl: url });
};
exports.getHls = getHls;
//# sourceMappingURL=stream.controller.js.map