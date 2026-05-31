import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

vi.mock('../db/index.js', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          { id: 'item-1', name: 'Shawarma Plate', basePrice: '14.99' },
        ]),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { id: 'item-1', name: 'Shawarma Plate', basePrice: '14.99', isAvailable: true },
        ]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: 'item-1' }]),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    }),
  },
  menuItems: {},
  menuCategories: {},
  stores: {},
}));

vi.mock('@halalgo/kafka', () => ({
  publishEvent: vi.fn().mockResolvedValue(undefined),
  KAFKA_TOPICS: { STORE_STATUS_CHANGED: 'store.status.changed' },
}));

describe('GET /api/menu/:storeId', () => {
  it('returns menu items for a store', async () => {
    const app = createApp();
    const res = await request(app).get('/api/menu/store-1');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
  });
});

describe('PATCH /api/menu/items/:id/availability', () => {
  it('toggles item availability', async () => {
    const app = createApp();
    const res = await request(app)
      .patch('/api/menu/items/item-1/availability')
      .send({ isAvailable: false });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 422 when isAvailable missing', async () => {
    const app = createApp();
    const res = await request(app)
      .patch('/api/menu/items/item-1/availability')
      .send({});
    expect(res.status).toBe(422);
  });
});
