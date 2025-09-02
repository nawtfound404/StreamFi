import app from './app';
import http from 'http';
import { Server as SocketIOServer, type ServerOptions } from 'socket.io';
import { logger } from './utils/logger';
import { onSocketConnection } from './services/overlay.service';
import { env } from './config/environment';
import { blockchainService } from './services/blockchain.service';

const PORT = env.port || 8000;

const httpServer = http.createServer(app);

/**
 * Some Socket.IO type packages (depending on version) omit `cors` in `ServerOptions`.
 * It's valid at runtime for v4+, so we cast to `any` for compatibility.
 */
const ioOptions: Partial<ServerOptions> & { cors?: any } = {
  cors: {
    origin: env.corsOrigin ? env.corsOrigin.split(',').map((s) => s.trim()) : '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
};

const io = new SocketIOServer(httpServer, ioOptions);

onSocketConnection(io);

httpServer.listen(PORT, () => {
  logger.info(`🚀 Server is running on port ${PORT}`);
  blockchainService.listenForDonations();
});
