import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

vi.mock('../elastic/client.js', () => ({
  esClient: {
    search: vi.fn().mockResolvedValue({
      hits: {
        hits: [
          {
            _id: 'store-1',
            _score: 1.5,
            _source: {
              id: 'store-1',
              name: 'Shawarma Palace',
              cuisineType: 'Lebanese',
              storeType: 'restaurant',
              isOpen: true,
              rating: 4.8,
              deliveryFee: 2.99,
              deliveryTimeMin: 30,
            },
          },
        ],
        total: { value: 1 },
      },
    }),
    update: vi.fn().mockResolvedValue({ result: 'updated' }),
    indices: {
      exists: vi.fn().mockResolvedValue(true),
      create: vi.fn().mockResolvedValue({}),
    },
  },
}));

describe('GET /api/search/stores', () => {
  it('returns search results for query', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/api/search/stores')
      .query({ q: 'shawarma', lat: '45.42', lng: '-75.69' });
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0].name).toBe('Shawarma Palace');
  });

  it('returns 422 when query is empty', async () => {
    const app = createApp();
    const res = await request(app).get('/api/search/stores');
    expect(res.status).toBe(422);
  });

  it('filters by storeType=grocery', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/api/search/stores')
      .query({ q: 'halal', storeType: 'grocery' });
    expect(res.status).toBe(200);
  });
});

describe('GET /api/search/menu', () => {
  it('returns menu item search results', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/api/search/menu')
      .query({ q: 'shawarma' });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.results)).toBe(true);
  });

  it('returns 422 when query missing', async () => {
    const app = createApp();
    const res = await request(app).get('/api/search/menu');
    expect(res.status).toBe(422);
  });
});
