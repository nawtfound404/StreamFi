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
            return next();
        }
        catch (e) {
            return next(new Error('unauthorized'));
        }
    }).on('connection', (socket) => {
        logger_1.logger.info(`New client connected: ${socket.id}`);
        const streamId = socket.handshake.query.streamId;
        let lastEmit = 0;
        const minIntervalMs = 300; // ~3 msgs/sec
        if (streamId) {
            socket.join(streamId);
            logger_1.logger.info(`Socket ${socket.id} joined room ${streamId}`);
        }
        socket.on('reaction', (data) => {
            io.to(data.streamId).emit('new_reaction', { type: data.type });
            logger_1.logger.info(`Reaction received for stream ${data.streamId}`);
        });
        // Basic chat relay for MVP
        socket.on('chat_message', (payload) => {
            const now = Date.now();
            if (now - lastEmit < minIntervalMs)
                return; // soft drop
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
};
exports.onSocketConnection = onSocketConnection;
//# sourceMappingURL=overlay.service.js.map