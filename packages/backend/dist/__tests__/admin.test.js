"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../../src/app"));
describe('Admin', () => {
    it('requires auth for mute', async () => {
        const res = await (0, supertest_1.default)(app_1.default).post('/api/admin/mute').send({ userId: 'x' });
        expect(res.status).toBe(401);
    });
});
//# sourceMappingURL=admin.test.js.map