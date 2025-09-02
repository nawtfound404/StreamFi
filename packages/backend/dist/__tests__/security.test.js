"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../app"));
describe('Security', () => {
    it('denies socket handshake without token (HTTP fallback)', async () => {
        // Socket.IO handshake is WebSocket; we simulate by hitting a protected API route requiring auth
        const res = await (0, supertest_1.default)(app_1.default).get('/api/users/me');
        expect([401, 403]).toContain(res.status);
    });
});
//# sourceMappingURL=security.test.js.map