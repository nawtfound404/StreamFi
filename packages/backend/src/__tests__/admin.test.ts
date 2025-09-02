import request from 'supertest';
import app from '../../src/app';

describe('Admin', () => {
  it('requires auth for mute', async () => {
    const res = await request(app).post('/api/admin/mute').send({ userId: 'x' });
    expect(res.status).toBe(401);
  });
});
