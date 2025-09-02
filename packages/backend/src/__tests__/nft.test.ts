import request from 'supertest';
import app from '../app';

describe('NFT routes', () => {
  it('POST /api/monetization/nft/mint requires auth', async () => {
    const res = await request(app)
      .post('/api/monetization/nft/mint')
      .send({ toWallet: '0x0000000000000000000000000000000000000001' });
    expect(res.status).toBe(401);
  });
});
