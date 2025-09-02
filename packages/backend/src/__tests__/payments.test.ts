import request from 'supertest';
import app from '../app';

describe('Payments', () => {
  it('stripe create intent validates input', async () => {
    const res = await request(app).post('/api/payments/stripe/create-payment-intent').send({});
    // May be 501 (no stripe) or 400 for missing params
    expect([400,501]).toContain(res.status);
  });
});
