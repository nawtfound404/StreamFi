import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import jwt from 'jsonwebtoken';
import { env } from '../config/environment';
import { prisma } from '../lib/prisma';

interface ReactionData {
  streamId: string;
  type: string;
}

// Fix the type issue by using the correct Server type
export const onSocketConnection = (io: Server) => {
  // Use the 'on' method directly on the io instance
  io.of("/").use(async (socket, next) => {
    try {
      const token = (socket.handshake.auth?.token || socket.handshake.headers['authorization']?.toString()?.replace('Bearer ', '') || socket.handshake.query.token) as string | undefined;
      if (!token) return next(new Error('unauthorized'));
  const decoded = jwt.verify(token, env.jwt.secret) as { id: string };
  const user = await prisma.user.findUnique({ where: { id: decoded.id } });
  if (!user || (user as any).banned) return next(new Error('forbidden'));
      (socket as any).userId = user.id;
      return next();
    } catch (e) {
      return next(new Error('unauthorized'));
    }
  }).on('connection', (socket: Socket) => {
    logger.info(`New client connected: ${socket.id}`);
    const streamId = socket.handshake.query.streamId as string;
  let lastEmit = 0;
  const minIntervalMs = 300; // ~3 msgs/sec

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
      const now = Date.now();
      if (now - lastEmit < minIntervalMs) return; // soft drop
      lastEmit = now;
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