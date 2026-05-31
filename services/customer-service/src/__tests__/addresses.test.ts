import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

vi.mock('../db/index.js', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          { id: 'addr-1', label: 'Home', city: 'Ottawa', isDefault: true },
        ]),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { id: 'addr-1', label: 'Home', city: 'Ottawa', isDefault: true },
        ]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    }),
  },
  addresses: {},
  customerProfiles: {},
}));

describe('POST /api/addresses', () => {
  it('creates address and returns 201', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/addresses')
      .set('x-clerk-user-id', 'user_123')
      .send({
        label: 'Home',
        street: '123 Main St',
        city: 'Ottawa',
        province: 'ON',
        postalCode: 'K1A 0A9',
        latitude: 45.42,
        longitude: -75.70,
        isDefault: true,
      });
    expect(res.status).toBe(201);
    expect(res.body.address.city).toBe('Ottawa');
  });

  it('returns 422 when province missing', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/addresses')
      .set('x-clerk-user-id', 'user_123')
      .send({ label: 'Home', street: '123', city: 'Ottawa' });
    expect(res.status).toBe(422);
  });
});

describe('GET /api/addresses', () => {
  it('returns user addresses', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/api/addresses')
      .set('x-clerk-user-id', 'user_123');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.addresses)).toBe(true);
  });
});

describe('DELETE /api/addresses/:id', () => {
  it('deletes address and returns success', async () => {
    const app = createApp();
    const res = await request(app)
      .delete('/api/addresses/addr-1')
      .set('x-clerk-user-id', 'user_123');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
