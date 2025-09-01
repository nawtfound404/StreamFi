"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const stream_controller_1 = require("./stream.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.post('/ingest', auth_middleware_1.authMiddleware, stream_controller_1.getIngest);
router.get('/:id/status', stream_controller_1.getStreamStatus);
router.get('/:id/hls', stream_controller_1.getHls);
exports.default = router;
//# sourceMappingURL=stream.routes.js.map