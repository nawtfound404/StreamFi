"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../app"));
describe('Payments', () => {
    it('stripe create intent validates input', async () => {
        const res = await (0, supertest_1.default)(app_1.default).post('/api/payments/stripe/create-payment-intent').send({});
        // May be 501 (no stripe) or 400 for missing params
        expect([400, 501]).toContain(res.status);
    });
});
//# sourceMappingURL=payments.test.js.map