"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.withReqId = withReqId;
const pino_1 = __importDefault(require("pino"));
const level = process.env.LOG_LEVEL || 'info';
exports.logger = (0, pino_1.default)({
    level,
    base: { service: 'streamfi-backend' },
    redact: ['req.headers.authorization', 'headers.authorization'],
    transport: process.env.NODE_ENV === 'production' ? undefined : {
        target: 'pino-pretty',
        options: { colorize: true }
    },
});
function withReqId(reqId) {
    return exports.logger.child({ reqId });
}
//# sourceMappingURL=logger.js.map