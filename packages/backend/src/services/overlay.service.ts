import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import jwt from 'jsonwebtoken';
import { env } from '../config/environment';
import { allowEvent } from '../utils/eventRateLimiter';
import { UserModel, StreamModel, BalanceModel, connectMongo } from '../lib/mongo';
import { getRoomSize } from '../lib/socket';
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
      if (token) {
        try {
          const decoded = jwt.verify(token, env.jwt.secret) as { id: string; role?: UserRole };
          await connectMongo();
          const user = await UserModel.findById(decoded.id).lean();
          if (!user || (user as any).banned) return next(new Error('forbidden'));
          (socket as any).userId = String((user as any)._id);
          (socket as any).role = (user as any).role;
          return next();
        } catch {
          // If token invalid, fall back to anonymous viewer
          (socket as any).userId = `anon:${socket.id}`;
          (socket as any).role = 'VIEWER';
          return next();
        }
      }
      // No token provided: allow anonymous viewer with limited capabilities
      (socket as any).userId = `anon:${socket.id}`;
      (socket as any).role = 'VIEWER';
      return next();
    } catch {
      // As a safety, allow anonymous if unexpected error to avoid blocking viewers
      (socket as any).userId = `anon:${socket.id}`;
      (socket as any).role = 'VIEWER';
      return next();
    }
  }).on('connection', async (socket: Socket) => {
    logger.info(`New client connected: ${socket.id}`);
    const idOrKey = (socket.handshake.query.streamId as string) || '';
    let joinedRooms: string[] = [];
  let lastEmit = 0;
  const minIntervalMs = 1000; // 1 msg/sec per user
  const burstLimit = 5; // allow small bursts
  const windowMs = 10_000; // 10 seconds
  const timestamps: number[] = [];

    if (idOrKey) {
      try {
        await connectMongo();
        // Find by id or by key to normalize
        const stream = await (async () => {
          try { return await StreamModel.findById(idOrKey).select({ _id: 1, streamKey: 1 }).lean(); } catch { return null; }
        })() || await StreamModel.findOne({ streamKey: idOrKey }).select({ _id: 1, streamKey: 1 }).lean();
        if (stream) {
          const id = String((stream as any)._id);
          const key = (stream as any).streamKey as string | undefined;
          socket.join(id);
          joinedRooms.push(id);
          if (key && key !== id) { socket.join(key); joinedRooms.push(key); }
          logger.info(`Socket ${socket.id} joined rooms ${joinedRooms.join(',')}`);
          // Notify current viewer counts
          for (const room of joinedRooms) {
            io.to(room).emit('viewer_count', { viewers: getRoomSize(room) });
          }
        } else {
          socket.join(idOrKey);
          joinedRooms.push(idOrKey);
          logger.info(`Socket ${socket.id} joined room ${idOrKey}`);
          io.to(idOrKey).emit('viewer_count', { viewers: getRoomSize(idOrKey) });
        }
      } catch {}
    }

    socket.on('reaction', async (data: ReactionData) => {
      const ok = allowEvent((socket as any).userId, 'reaction', { limit: 10, windowMs: 10_000 });
      if (!ok) return;
      const uid = (socket as any).userId as string;
      try {
        await connectMongo();
    // Load stream to access monetization rules
    const stream = await StreamModel.findById(data.streamId).select({ _id: 1, monetizationRules: 1 }).lean();
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
  const room = payload.streamId || idOrKey;
      if (!room || !payload.text?.trim()) return;
      io.to(room).emit('chat_message', {
        id: Date.now().toString(),
        user: payload.user || ((socket as any).userId?.toString?.().slice(0, 6) || 'anon'),
        text: payload.text,
        at: Date.now(),
      });
    });

      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
        // Update viewer counts for joined rooms
        try {
          for (const room of joinedRooms) {
            io.to(room).emit('viewer_count', { viewers: io.sockets.adapter.rooms.get(room)?.size || 0 });
          }
        } catch { /* noop */ }
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