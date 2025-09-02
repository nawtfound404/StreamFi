import request from 'supertest';
import app from '../../src/app';

describe('Stream', () => {
  it('ingest requires auth', async () => {
    const res = await request(app).post('/api/stream/ingest');
    expect(res.status).toBe(401);
  });
});
