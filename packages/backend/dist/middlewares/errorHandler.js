"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const logger_1 = require("../utils/logger");
const errorHandler = (err, _req, res, _next) => {
    logger_1.logger.error(err.stack);
    res.status(500).json({ message: err.message || 'Something went wrong!' });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map