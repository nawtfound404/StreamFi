"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHls = exports.getStreamStatus = exports.getIngest = void 0;
const getIngest = (_req, res) => res.status(200).json({ ingestUrl: 'rtmp://ingest.streamfi.io/live', streamKey: 'sk_demo_12345', status: 'idle' });
exports.getIngest = getIngest;
const getStreamStatus = (req, res) => res.status(200).json({ id: req.params.id, status: 'live', viewers: 123, startedAt: new Date() });
exports.getStreamStatus = getStreamStatus;
const getHls = (req, res) => {
    const url = `https://hls.streamfi.io/live/${req.params.id}/index.m3u8`;
    if (req.query.redirect)
        return res.redirect(302, url);
    return res.status(200).json({ hlsUrl: url });
};
exports.getHls = getHls;
//# sourceMappingURL=stream.controller.js.map