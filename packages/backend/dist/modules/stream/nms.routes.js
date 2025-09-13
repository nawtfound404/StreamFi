"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mongo_1 = require("../../lib/mongo");
const socket_1 = require("../../lib/socket");
const router = (0, express_1.Router)();
// These endpoints can be called by the Node Media Server container via internal network
router.post('/publish', async (req, res) => {
    try {
        const { key } = req.body;
        if (!key)
            return res.status(400).json({ ok: false });
        await (0, mongo_1.connectMongo)();
        const stream = await mongo_1.StreamModel.findOneAndUpdate({ streamKey: key }, { $set: { status: 'LIVE', startedAt: new Date() } }, { new: true }).lean();
        if (stream)
            (0, socket_1.emitToStreamRooms)({ id: String(stream._id), key }, 'stream_status', { status: 'LIVE' });
        return res.json({ ok: true });
    }
    catch {
        return res.status(500).json({ ok: false });
    }
});
router.post('/unpublish', async (req, res) => {
    try {
        const { key } = req.body;
        if (!key)
            return res.status(400).json({ ok: false });
        await (0, mongo_1.connectMongo)();
        const stream = await mongo_1.StreamModel.findOneAndUpdate({ streamKey: key }, { $set: { status: 'IDLE', endedAt: new Date() } }, { new: true }).lean();
        if (stream)
            (0, socket_1.emitToStreamRooms)({ id: String(stream._id), key }, 'stream_status', { status: 'IDLE' });
        return res.json({ ok: true });
    }
    catch {
        return res.status(500).json({ ok: false });
    }
});
exports.default = router;
//# sourceMappingURL=nms.routes.js.map