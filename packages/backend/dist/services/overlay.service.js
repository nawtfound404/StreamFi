"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onSocketConnection = void 0;
const logger_1 = require("../utils/logger");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const environment_1 = require("../config/environment");
const prisma_1 = require("../lib/prisma");
const eventRateLimiter_1 = require("../utils/eventRateLimiter");
// Fix the type issue by using the correct Server type
const onSocketConnection = (io) => {
    // Use the 'on' method directly on the io instance
    io.of("/").use(async (socket, next) => {
        try {
            const token = (socket.handshake.auth?.token || socket.handshake.headers['authorization']?.toString()?.replace('Bearer ', '') || socket.handshake.query.token);
            if (!token)
                return next(new Error('unauthorized'));
            const decoded = jsonwebtoken_1.default.verify(token, environment_1.env.jwt.secret);
            const user = await prisma_1.prisma.user.findUnique({ where: { id: decoded.id } });
            if (!user || user.banned)
                return next(new Error('forbidden'));
            socket.userId = user.id;
            socket.role = user.role;
            return next();
        }
        catch (e) {
            return next(new Error('unauthorized'));
        }
    }).on('connection', (socket) => {
        logger_1.logger.info(`New client connected: ${socket.id}`);
        const streamId = socket.handshake.query.streamId || '';
        let lastEmit = 0;
        const minIntervalMs = 1000; // 1 msg/sec per user
        const burstLimit = 5; // allow small bursts
        const windowMs = 10_000; // 10 seconds
        const timestamps = [];
        if (streamId) {
            // Authorization: viewer can join any public stream room; streamer/admin can join their own admin rooms
            // For now, enforce that only streamer of the streamId (by DB relation) or admins can join moderation room
            socket.join(streamId);
            logger_1.logger.info(`Socket ${socket.id} joined room ${streamId}`);
        }
        socket.on('reaction', (data) => {
            const ok = (0, eventRateLimiter_1.allowEvent)(socket.userId, 'reaction', { limit: 10, windowMs: 10_000 });
            if (!ok)
                return;
            io.to(data.streamId).emit('new_reaction', { type: data.type });
            logger_1.logger.info(`Reaction received for stream ${data.streamId}`);
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
            const room = payload.streamId || streamId;
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
            const user = await prisma_1.prisma.user.findUnique({ where: { id: decoded.id } });
            if (!user || user.banned)
                return next(new Error('forbidden'));
            if (user.role === 'ADMIN') {
                socket.userId = user.id;
                return next();
            }
            // check ownership
            const stream = await prisma_1.prisma.stream.findFirst({ where: { id: streamId, streamerId: user.id }, select: { id: true } });
            if (!stream)
                return next(new Error('forbidden'));
            socket.userId = user.id;
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