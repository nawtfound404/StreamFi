"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onSocketConnection = void 0;
const logger_1 = require("../utils/logger");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const environment_1 = require("../config/environment");
const eventRateLimiter_1 = require("../utils/eventRateLimiter");
const mongo_1 = require("../lib/mongo");
const socket_1 = require("../lib/socket");
// Fix the type issue by using the correct Server type
const onSocketConnection = (io) => {
    // Use the 'on' method directly on the io instance
    io.of("/").use(async (socket, next) => {
        try {
            const token = (socket.handshake.auth?.token || socket.handshake.headers['authorization']?.toString()?.replace('Bearer ', '') || socket.handshake.query.token);
            if (!token)
                return next(new Error('unauthorized'));
            const decoded = jsonwebtoken_1.default.verify(token, environment_1.env.jwt.secret);
            await (0, mongo_1.connectMongo)();
            const user = await mongo_1.UserModel.findById(decoded.id).lean();
            if (!user || user.banned)
                return next(new Error('forbidden'));
            socket.userId = String(user._id);
            socket.role = user.role;
            return next();
        }
        catch (e) {
            return next(new Error('unauthorized'));
        }
    }).on('connection', async (socket) => {
        logger_1.logger.info(`New client connected: ${socket.id}`);
        const idOrKey = socket.handshake.query.streamId || '';
        let joinedRooms = [];
        let lastEmit = 0;
        const minIntervalMs = 1000; // 1 msg/sec per user
        const burstLimit = 5; // allow small bursts
        const windowMs = 10_000; // 10 seconds
        const timestamps = [];
        if (idOrKey) {
            try {
                await (0, mongo_1.connectMongo)();
                // Find by id or by key to normalize
                const stream = await (async () => {
                    try {
                        return await mongo_1.StreamModel.findById(idOrKey).select({ _id: 1, streamKey: 1 }).lean();
                    }
                    catch {
                        return null;
                    }
                })() || await mongo_1.StreamModel.findOne({ streamKey: idOrKey }).select({ _id: 1, streamKey: 1 }).lean();
                if (stream) {
                    const id = String(stream._id);
                    const key = stream.streamKey;
                    socket.join(id);
                    joinedRooms.push(id);
                    if (key && key !== id) {
                        socket.join(key);
                        joinedRooms.push(key);
                    }
                    logger_1.logger.info(`Socket ${socket.id} joined rooms ${joinedRooms.join(',')}`);
                    // Notify current viewer counts
                    for (const room of joinedRooms) {
                        io.to(room).emit('viewer_count', { viewers: (0, socket_1.getRoomSize)(room) });
                    }
                }
                else {
                    socket.join(idOrKey);
                    joinedRooms.push(idOrKey);
                    logger_1.logger.info(`Socket ${socket.id} joined room ${idOrKey}`);
                    io.to(idOrKey).emit('viewer_count', { viewers: (0, socket_1.getRoomSize)(idOrKey) });
                }
            }
            catch { }
        }
        socket.on('reaction', async (data) => {
            const ok = (0, eventRateLimiter_1.allowEvent)(socket.userId, 'reaction', { limit: 10, windowMs: 10_000 });
            if (!ok)
                return;
            const uid = socket.userId;
            try {
                await (0, mongo_1.connectMongo)();
                // Load stream to access monetization rules
                const stream = await mongo_1.StreamModel.findById(data.streamId).select({ _id: 1, monetizationRules: 1 }).lean();
                if (!stream)
                    return;
                const rules = stream.monetizationRules || {};
                const costs = (rules.reactionCosts || {});
                const cost = Math.max(0, Number(costs[data.type] ?? 1));
                if (cost > 0) {
                    // Atomically increment spent if it doesn't exceed deposited
                    const result = await mongo_1.BalanceModel.findOneAndUpdate({ userId: uid, streamId: stream._id, $expr: { $lte: [{ $add: ['$spent', cost] }, '$deposited'] } }, { $inc: { spent: cost } }, { new: true }).lean();
                    if (!result) {
                        // Insufficient balance
                        socket.emit('reaction_denied', { reason: 'insufficient_balance' });
                        return;
                    }
                }
                io.to(data.streamId).emit('new_reaction', { type: data.type, by: uid });
                logger_1.logger.info(`Reaction received for stream ${data.streamId}`);
            }
            catch (e) {
                logger_1.logger.warn({ err: e }, 'reaction handling failed');
            }
        });
        // Basic chat relay for MVP
        socket.on('chat_message', (payload) => {
            const ok = (0, eventRateLimiter_1.allowEvent)(socket.userId, 'chat_message', { limit: 20, windowMs: 10_000 });
            if (!ok)
                return;
            const now = Date.now();
            // sliding window anti-spam
            while (timestamps.length && now - timestamps[0] > windowMs)
                timestamps.shift();
            if (timestamps.length >= burstLimit)
                return; // drop if over burst limit
            if (now - lastEmit < minIntervalMs)
                return; // drop if under cooldown
            timestamps.push(now);
            lastEmit = now;
            const room = payload.streamId || idOrKey;
            if (!room || !payload.text?.trim())
                return;
            io.to(room).emit('chat_message', {
                id: Date.now().toString(),
                user: payload.user || 'anon',
                text: payload.text,
                at: Date.now(),
            });
        });
        socket.on('disconnect', () => {
            logger_1.logger.info(`Client disconnected: ${socket.id}`);
            // Update viewer counts for joined rooms
            try {
                for (const room of joinedRooms) {
                    io.to(room).emit('viewer_count', { viewers: io.sockets.adapter.rooms.get(room)?.size || 0 });
                }
            }
            catch { /* noop */ }
        });
    });
    // Moderation namespace: only streamer who owns streamId or admin can join
    io.of(/^\/mod\/[\w-]+$/).use(async (socket, next) => {
        try {
            const token = (socket.handshake.auth?.token || socket.handshake.headers['authorization']?.toString()?.replace('Bearer ', '') || socket.handshake.query.token);
            if (!token)
                return next(new Error('unauthorized'));
            const decoded = jsonwebtoken_1.default.verify(token, environment_1.env.jwt.secret);
            const ns = socket.nsp.name; // e.g. /mod/<streamId>
            const streamId = ns.split('/')[2];
            await (0, mongo_1.connectMongo)();
            const user = await mongo_1.UserModel.findById(decoded.id).lean();
            if (!user || user.banned)
                return next(new Error('forbidden'));
            if (user.role === 'ADMIN') {
                socket.userId = String(user._id);
                return next();
            }
            // check ownership
            const stream = await mongo_1.StreamModel.findOne({ _id: streamId, streamerId: user._id }).select({ _id: 1 }).lean();
            if (!stream)
                return next(new Error('forbidden'));
            socket.userId = String(user._id);
            return next();
        }
        catch {
            return next(new Error('unauthorized'));
        }
    }).on('connection', (socket) => {
        const ns = socket.nsp.name;
        const streamId = ns.split('/')[2];
        socket.join(streamId);
        socket.on('mod_action', (payload) => {
            const ok = (0, eventRateLimiter_1.allowEvent)(socket.userId, 'mod_action', { limit: 30, windowMs: 60_000 });
            if (!ok)
                return;
            // Broadcast moderation events to room moderators
            io.of(ns).to(streamId).emit('mod_event', payload);
        });
    });
};
exports.onSocketConnection = onSocketConnection;
//# sourceMappingURL=overlay.service.js.map