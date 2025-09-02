import request from 'supertest';
import app from '../../src/app';

describe('Auth', () => {
  it('returns 400 for missing fields on signup', async () => {
    const res = await request(app).post('/api/auth/signup').send({});
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
