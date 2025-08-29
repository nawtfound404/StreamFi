import app from './app';
import http from 'http';
import { Server as SocketIOServer, type ServerOptions } from 'socket.io';
import { logger } from './utils/logger';
import { onSocketConnection } from './services/overlay.service';
import { env } from './config/environment';

const PORT = env.port || 8000;

const httpServer = http.createServer(app);

/**
 * Some Socket.IO type packages (depending on lockfile resolution) omit `cors` in `ServerOptions`.
 * It's valid at runtime for v4+, so we cast the options to satisfy TS while keeping strictness elsewhere.
 */
const ioOptions: Partial<ServerOptions> = {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
};

const io = new SocketIOServer(httpServer, ioOptions);

onSocketConnection(io);

httpServer.listen(PORT, () => {
  logger.info(`🚀 Server is running on port ${PORT}`);
});
