"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../../src/app"));
describe('Stream', () => {
    it('ingest requires auth', async () => {
        const res = await (0, supertest_1.default)(app_1.default).post('/api/stream/ingest');
        expect(res.status).toBe(401);
    });
});
//# sourceMappingURL=stream.test.js.map