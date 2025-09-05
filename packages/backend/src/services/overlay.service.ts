import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import jwt from 'jsonwebtoken';
import { env } from '../config/environment';
import { allowEvent } from '../utils/eventRateLimiter';
import { UserModel, StreamModel, BalanceModel, connectMongo } from '../lib/mongo';
import { UserRole } from '../types/models';

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
  const decoded = jwt.verify(token, env.jwt.secret) as { id: string; role?: UserRole };
  await connectMongo();
  const user = await UserModel.findById(decoded.id).lean();
  if (!user || (user as any).banned) return next(new Error('forbidden'));
      (socket as any).userId = String((user as any)._id);
  (socket as any).role = (user as any).role;
      return next();
    } catch (e) {
      return next(new Error('unauthorized'));
    }
  }).on('connection', (socket: Socket) => {
    logger.info(`New client connected: ${socket.id}`);
    const streamId = (socket.handshake.query.streamId as string) || '';
  let lastEmit = 0;
  const minIntervalMs = 1000; // 1 msg/sec per user
  const burstLimit = 5; // allow small bursts
  const windowMs = 10_000; // 10 seconds
  const timestamps: number[] = [];

    if (streamId) {
      // Authorization: viewer can join any public stream room; streamer/admin can join their own admin rooms
      // For now, enforce that only streamer of the streamId (by DB relation) or admins can join moderation room
      socket.join(streamId);
      logger.info(`Socket ${socket.id} joined room ${streamId}`);
    }

    socket.on('reaction', async (data: ReactionData) => {
      const ok = allowEvent((socket as any).userId, 'reaction', { limit: 10, windowMs: 10_000 });
      if (!ok) return;
      const uid = (socket as any).userId as string;
      try {
        await connectMongo();
  const stream = await StreamModel.findById(data.streamId).lean();
        if (!stream) return;
        const rules = (stream as any).monetizationRules || {};
        const costs = (rules.reactionCosts || {}) as Record<string, number>;
        const cost = Math.max(0, Number(costs[data.type] ?? 1));
        if (cost > 0) {
          // Atomically increment spent if it doesn't exceed deposited
          const result = await BalanceModel.findOneAndUpdate(
            { userId: uid, streamId: (stream as any)._id, $expr: { $lte: [{ $add: ['$spent', cost] }, '$deposited'] } },
            { $inc: { spent: cost } },
            { new: true }
          ).lean();
          if (!result) {
            // Insufficient balance
            socket.emit('reaction_denied', { reason: 'insufficient_balance' });
            return;
          }
        }
        io.to(data.streamId).emit('new_reaction', { type: data.type, by: uid });
        logger.info(`Reaction received for stream ${data.streamId}`);
      } catch (e) {
        logger.warn({ err: e }, 'reaction handling failed');
      }
    });

    // Basic chat relay for MVP
    socket.on('chat_message', (payload: { streamId: string; user?: string; text: string }) => {
      const ok = allowEvent((socket as any).userId, 'chat_message', { limit: 20, windowMs: 10_000 });
      if (!ok) return;
      const now = Date.now();
      // sliding window anti-spam
      while (timestamps.length && now - timestamps[0] > windowMs) timestamps.shift();
      if (timestamps.length >= burstLimit) return; // drop if over burst limit
      if (now - lastEmit < minIntervalMs) return; // drop if under cooldown
      timestamps.push(now);
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

  // Moderation namespace: only streamer who owns streamId or admin can join
  io.of(/^\/mod\/[\w-]+$/).use(async (socket, next) => {
    try {
      const token = (socket.handshake.auth?.token || socket.handshake.headers['authorization']?.toString()?.replace('Bearer ', '') || socket.handshake.query.token) as string | undefined;
      if (!token) return next(new Error('unauthorized'));
      const decoded = jwt.verify(token, env.jwt.secret) as { id: string };
      const ns = socket.nsp.name; // e.g. /mod/<streamId>
      const streamId = ns.split('/')[2];
      await connectMongo();
      const user = await UserModel.findById(decoded.id).lean();
  if (!user || (user as any).banned) return next(new Error('forbidden'));
  if ((user as any).role === 'ADMIN') { (socket as any).userId = String((user as any)._id); return next(); }
      // check ownership
      const stream = await StreamModel.findOne({ _id: streamId, streamerId: (user as any)._id }).select({ _id: 1 }).lean();
      if (!stream) return next(new Error('forbidden'));
      (socket as any).userId = String((user as any)._id);
      return next();
    } catch { return next(new Error('unauthorized')); }
  }).on('connection', (socket: Socket) => {
    const ns = socket.nsp.name;
    const streamId = ns.split('/')[2];
    socket.join(streamId);
    socket.on('mod_action', (payload: { type: string; targetUserId?: string }) => {
      const ok = allowEvent((socket as any).userId, 'mod_action', { limit: 30, windowMs: 60_000 });
      if (!ok) return;
      // Broadcast moderation events to room moderators
      io.of(ns).to(streamId).emit('mod_event', payload);
    });
  });
};