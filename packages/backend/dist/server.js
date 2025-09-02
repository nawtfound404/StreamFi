"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const logger_1 = require("./utils/logger");
const overlay_service_1 = require("./services/overlay.service");
const socket_1 = require("./lib/socket");
const environment_1 = require("./config/environment");
const blockchain_service_1 = require("./services/blockchain.service");
const nft_indexer_service_1 = require("./services/nft-indexer.service");
const PORT = environment_1.env.port || 8000;
const httpServer = http_1.default.createServer(app_1.default);
/**
 * Some Socket.IO type packages (depending on version) omit `cors` in `ServerOptions`.
 * It's valid at runtime for v4+, so we cast to `any` for compatibility.
 */
const ioOptions = {
    cors: {
        origin: environment_1.env.corsOrigin ? environment_1.env.corsOrigin.split(',').map((s) => s.trim()) : false,
        methods: ['GET', 'POST'],
        credentials: true,
    },
};
const io = new socket_io_1.Server(httpServer, ioOptions);
(0, socket_1.setSocket)(io);
(0, overlay_service_1.onSocketConnection)(io);
httpServer.listen(PORT, () => {
    logger_1.logger.info(`🚀 Server is running on port ${PORT}`);
    blockchain_service_1.blockchainService.listenForDonations();
    // Kick off NFT indexer (non-blocking)
    nft_indexer_service_1.nftIndexer.backfill().then(() => logger_1.logger.info('✅ NFT backfill complete')).catch((e) => logger_1.logger.error({ err: e }, 'NFT backfill failed'));
    nft_indexer_service_1.nftIndexer.subscribe();
});
//# sourceMappingURL=server.js.map