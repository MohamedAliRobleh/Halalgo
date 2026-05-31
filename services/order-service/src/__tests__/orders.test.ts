import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

vi.mock('../db/index.js', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          { id: 'order-1', status: 'pending', total: '35.50', clerkCustomerId: 'user_123' },
        ]),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { id: 'order-1', status: 'pending', clerkCustomerId: 'user_123', storeId: 'store-1', driverId: null, subtotal: '29.98', deliveryFee: '2.99', taxes: '3.90', tip: '0', discount: '0', total: '36.87', stripePaymentIntentId: null },
        ]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'order-1', status: 'confirmed' }]),
        }),
      }),
    }),
  },
  orders: {},
  orderItems: {},
  orderStatusHistory: {},
}));

vi.mock('@halalgo/kafka', () => ({
  publishEvent: vi.fn().mockResolvedValue(undefined),
  KAFKA_TOPICS: {
    ORDER_CREATED: 'order.created',
    ORDER_STATUS_UPDATED: 'order.status.updated',
    ORDER_COMPLETED: 'order.completed',
    ORDER_CANCELLED: 'order.cancelled',
  },
}));

describe('POST /api/orders', () => {
  it('creates an order and returns pending status', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/orders')
      .set('x-clerk-user-id', 'user_123')
      .send({
        storeId: 'store-1',
        items: [{ menuItemId: 'item-1', quantity: 2, unitPrice: 14.99, selectedModifiers: [] }],
        deliveryAddress: {
          street: '123 Main St', city: 'Ottawa',
          province: 'ON', postalCode: 'K1A 0A9',
          latitude: 45.42, longitude: -75.70,
        },
        subtotal: 29.98,
        deliveryFee: 2.99,
        tip: 0,
        promoCodeUsed: null,
        specialInstructions: null,
      });
    expect(res.status).toBe(201);
    expect(res.body.order.status).toBe('pending');
  });

  it('returns 422 when storeId missing', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/orders')
      .set('x-clerk-user-id', 'user_123')
      .send({ items: [] });
    expect(res.status).toBe(422);
  });
});

describe('PATCH /api/orders/:id/status', () => {
  it('transitions order status', async () => {
    const app = createApp();
    const res = await request(app)
      .patch('/api/orders/order-1/status')
      .send({ status: 'confirmed', changedByRole: 'store' });
    expect(res.status).toBe(200);
  });

  it('rejects invalid transition', async () => {
    const { db } = await import('../db/index.js');
    (db.select as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { id: 'order-1', status: 'delivered', clerkCustomerId: 'user_123', storeId: 'store-1', driverId: null, total: '35.50', stripePaymentIntentId: null },
        ]),
      }),
    });
    const app = createApp();
    const res = await request(app)
      .patch('/api/orders/order-1/status')
      .send({ status: 'preparing', changedByRole: 'store' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/cannot transition/i);
  });
});
