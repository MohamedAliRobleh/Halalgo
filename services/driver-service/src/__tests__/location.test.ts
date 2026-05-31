import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

vi.mock('ioredis', () => {
  const MockRedis = vi.fn().mockImplementation(() => ({
    setex: vi.fn().mockResolvedValue('OK'),
    get:   vi.fn().mockResolvedValue(null),
  }));
  return { default: MockRedis, Redis: MockRedis };
});

vi.mock('@halalgo/kafka', () => ({
  publishEvent: vi.fn().mockResolvedValue(undefined),
  KAFKA_TOPICS: {
    DRIVER_LOCATION_UPDATED:    'driver.location.updated',
    DRIVER_AVAILABILITY_CHANGED: 'driver.availability.changed',
  },
}));

vi.mock('../db/index.js', () => ({
  db: {
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
    }),
  },
  driverProfiles: {},
}));

describe('PATCH /api/drivers/location', () => {
  it('accepts valid location update', async () => {
    const app = createApp();
    const res = await request(app)
      .patch('/api/drivers/location')
      .set('x-clerk-user-id', 'user_driver_1')
      .send({ latitude: 45.4215, longitude: -75.6972, activeOrderId: null });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 422 when coordinates missing', async () => {
    const app = createApp();
    const res = await request(app)
      .patch('/api/drivers/location')
      .set('x-clerk-user-id', 'user_driver_1')
      .send({});
    expect(res.status).toBe(422);
  });
});

describe('PATCH /api/drivers/availability', () => {
  it('sets driver online', async () => {
    const app = createApp();
    const res = await request(app)
      .patch('/api/drivers/availability')
      .set('x-clerk-user-id', 'user_driver_1')
      .send({ isAvailable: true });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 422 when isAvailable missing', async () => {
    const app = createApp();
    const res = await request(app)
      .patch('/api/drivers/availability')
      .set('x-clerk-user-id', 'user_driver_1')
      .send({});
    expect(res.status).toBe(422);
  });
});
