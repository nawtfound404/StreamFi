"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../../src/app"));
describe('Auth', () => {
    it('returns 400 for missing fields on signup', async () => {
        const res = await (0, supertest_1.default)(app_1.default).post('/api/auth/signup').send({});
        expect(res.status).toBeGreaterThanOrEqual(400);
    });
});
//# sourceMappingURL=auth.test.js.map