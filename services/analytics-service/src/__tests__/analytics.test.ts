import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

vi.mock('../db/index.js', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            { date: '2026-05-31', totalRevenue: '1250.00', orderCount: 42, platformFees: '250.00' },
          ]),
        }),
      }),
    }),
    execute: vi.fn().mockResolvedValue({ rows: [] }),
  },
  dailyRevenue: {},
  storeRevenue: {},
  hourlyOrders: {},
}));

describe('GET /api/analytics/dashboard', () => {
  it('returns dashboard with revenue and orders', async () => {
    const app = createApp();
    const res = await request(app).get('/api/analytics/dashboard');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('revenue');
    expect(res.body).toHaveProperty('orders');
    expect(res.body.revenue).toHaveProperty('today');
    expect(res.body.revenue).toHaveProperty('orderCount');
  });
});

describe('GET /api/analytics/revenue', () => {
  it('returns revenue trend data', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/api/analytics/revenue')
      .query({ days: '7' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('defaults to 7 days when days param missing', async () => {
    const app = createApp();
    const res = await request(app).get('/api/analytics/revenue');
    expect(res.status).toBe(200);
  });
});
