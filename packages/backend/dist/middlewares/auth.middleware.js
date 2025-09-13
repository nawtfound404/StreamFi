"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const environment_1 = require("../config/environment");
const logger_1 = require("../utils/logger");
const mongo_1 = require("../lib/mongo");
const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }
    const token = authHeader.split(' ')[1];
    try {
        await (0, mongo_1.connectMongo)();
        const decoded = jsonwebtoken_1.default.verify(token, environment_1.env.jwt.secret);
        // Enforce ban: check DB for banned flag and pull walletAddress for channel flows
        const user = await mongo_1.UserModel.findById(decoded.id).select('role banned walletAddress').lean();
        if (!user)
            return res.status(401).json({ message: 'Unauthorized: User not found' });
        if (user.banned)
            return res.status(403).json({ message: 'Account banned' });
        req.user = {
            id: String(user._id),
            role: user.role,
            walletAddress: user.walletAddress || undefined,
            address: user.walletAddress || undefined,
        };
        next();
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Invalid token');
        return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }
};
exports.authMiddleware = authMiddleware;
//# sourceMappingURL=auth.middleware.js.map