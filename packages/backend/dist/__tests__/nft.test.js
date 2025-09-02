"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../app"));
describe('NFT routes', () => {
    it('POST /api/monetization/nft/mint requires auth', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .post('/api/monetization/nft/mint')
            .send({ toWallet: '0x0000000000000000000000000000000000000001' });
        expect(res.status).toBe(401);
    });
});
//# sourceMappingURL=nft.test.js.map