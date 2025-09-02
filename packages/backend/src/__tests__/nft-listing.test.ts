import request from 'supertest';
import app from '../app';

describe('NFT listing', () => {
  it('GET /api/monetization/nft/owner/:address requires auth', async () => {
    const res = await request(app).get('/api/monetization/nft/owner/0x0000000000000000000000000000000000000001');
    expect(res.status).toBe(401);
  });
});
