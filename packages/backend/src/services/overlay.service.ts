import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';

interface ReactionData {
  streamId: string;
  type: string;
}

// Fix the type issue by using the correct Server type
export const onSocketConnection = (io: Server) => {
  // Use the 'on' method directly on the io instance
  io.of("/").on('connection', (socket: Socket) => {
    logger.info(`New client connected: ${socket.id}`);
    const streamId = socket.handshake.query.streamId as string;

    if (streamId) {
      socket.join(streamId);
      logger.info(`Socket ${socket.id} joined room ${streamId}`);
    }

    socket.on('reaction', (data: ReactionData) => {
      io.to(data.streamId).emit('new_reaction', { type: data.type });
      logger.info(`Reaction received for stream ${data.streamId}`);
    });

    // Basic chat relay for MVP
    socket.on('chat_message', (payload: { streamId: string; user?: string; text: string }) => {
      const room = payload.streamId || streamId;
      if (!room || !payload.text?.trim()) return;
      io.to(room).emit('chat_message', {
        id: Date.now().toString(),
        user: payload.user || 'anon',
        text: payload.text,
        at: Date.now(),
      });
    });

    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });
};