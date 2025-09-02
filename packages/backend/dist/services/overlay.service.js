"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onSocketConnection = void 0;
const logger_1 = require("../utils/logger");
// Fix the type issue by using the correct Server type
const onSocketConnection = (io) => {
    // Use the 'on' method directly on the io instance
    io.of("/").on('connection', (socket) => {
        logger_1.logger.info(`New client connected: ${socket.id}`);
        const streamId = socket.handshake.query.streamId;
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