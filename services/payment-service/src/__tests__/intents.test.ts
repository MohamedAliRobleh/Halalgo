import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

vi.mock('../stripe/client.js', () => ({
  stripe: {
    paymentIntents: {
      create: vi.fn().mockResolvedValue({
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret_abc',
        status: 'requires_payment_method',
        amount: 3550,
        currency: 'cad',
      }),
    },
  },
}));

vi.mock('../db/index.js', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'tx-1' }]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
    }),
  },
  transactions: {},
}));

vi.mock('@halalgo/kafka', () => ({
  publishEvent: vi.fn().mockResolvedValue(undefined),
  KAFKA_TOPICS: { PAYMENT_COMPLETED: 'payment.completed' },
}));

describe('POST /api/payments/create-intent', () => {
  it('creates a Stripe payment intent and returns clientSecret', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/payments/create-intent')
      .set('x-clerk-user-id', 'user_123')
      .send({ orderId: 'order-1', amount: 35.50, currency: 'cad' });
    expect(res.status).toBe(201);
    expect(res.body.clientSecret).toBe('pi_test_123_secret_abc');
    expect(res.body.paymentIntentId).toBe('pi_test_123');
  });

  it('returns 422 when amount missing', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/payments/create-intent')
      .set('x-clerk-user-id', 'user_123')
      .send({ orderId: 'order-1' });
    expect(res.status).toBe(422);
  });

  it('returns 422 when orderId missing', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/payments/create-intent')
      .set('x-clerk-user-id', 'user_123')
      .send({ amount: 35.50 });
    expect(res.status).toBe(422);
  });
});
