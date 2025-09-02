import request from 'supertest';
import app from '../app';

describe('Security', () => {
  it('denies socket handshake without token (HTTP fallback)', async () => {
    // Socket.IO handshake is WebSocket; we simulate by hitting a protected API route requiring auth
    const res = await request(app).get('/api/users/me');
    expect([401,403]).toContain(res.status);
  });
});
