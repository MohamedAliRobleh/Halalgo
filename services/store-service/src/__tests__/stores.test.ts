import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

vi.mock('../db/index.js', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          {
            id: 'store-1',
            name: 'Shawarma Palace',
            storeType: 'restaurant',
            isOpen: true,
            rating: 4.8,
            deliveryFee: '2.99',
            deliveryTimeMin: 30,
            isVerified: true,
            latitude: '45.4215',
            longitude: '-75.6972',
          },
        ]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
  },
  stores: {},
}));

vi.mock('@halalgo/kafka', () => ({
  publishEvent: vi.fn().mockResolvedValue(undefined),
  KAFKA_TOPICS: { STORE_STATUS_CHANGED: 'store.status.changed' },
}));

describe('GET /api/stores/nearby', () => {
  it('returns 400 when lat/lng missing', async () => {
    const app = createApp();
    const res = await request(app).get('/api/stores/nearby');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/lat.*lng/i);
  });

  it('returns stores array when lat/lng provided', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/api/stores/nearby')
      .query({ lat: '45.4215', lng: '-75.6972', radiusKm: '5' });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.stores)).toBe(true);
  });
});

describe('GET /api/stores/:id', () => {
  it('returns 404 for unknown store', async () => {
    const { db } = await import('../db/index.js');
    (db.select as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });
    const app = createApp();
    const res = await request(app).get('/api/stores/nonexistent');
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/stores/:id/status', () => {
  it('updates store open status', async () => {
    const app = createApp();
    const res = await request(app)
      .patch('/api/stores/store-1/status')
      .send({ isOpen: false });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 422 when isOpen missing', async () => {
    const app = createApp();
    const res = await request(app)
      .patch('/api/stores/store-1/status')
      .send({});
    expect(res.status).toBe(422);
  });
});
