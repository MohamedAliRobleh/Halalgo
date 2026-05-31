import type { Request, Response } from 'express';
import { db, orders, orderItems, orderStatusHistory } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { publishEvent, KAFKA_TOPICS } from '@halalgo/kafka';
import { calculateTax } from '@halalgo/utils';
import { OrderFSM, InvalidTransitionError } from '../fsm/orderFSM.js';
import { z } from 'zod';
import type { CanadianProvince } from '@halalgo/utils';
import type { ChangedByRole } from '@halalgo/types';

const orderItemSchema = z.object({
  menuItemId:        z.string(),
  quantity:          z.number().int().positive(),
  unitPrice:         z.number().positive(),
  selectedModifiers: z.array(z.object({
    modifierId: z.string(),
    name:       z.string(),
    priceDelta: z.number(),
  })).default([]),
  specialRequests: z.string().optional(),
});

const deliveryAddressSchema = z.object({
  street:     z.string(),
  city:       z.string(),
  province:   z.string().length(2),
  postalCode: z.string(),
  latitude:   z.number(),
  longitude:  z.number(),
  label:      z.string().optional(),
});

export const createOrderSchema = z.object({
  storeId:             z.string(),
  items:               z.array(orderItemSchema).min(1),
  deliveryAddress:     deliveryAddressSchema,
  subtotal:            z.number().positive(),
  deliveryFee:         z.number().min(0).default(0),
  tip:                 z.number().min(0).default(0),
  promoCodeUsed:       z.string().nullable().default(null),
  specialInstructions: z.string().nullable().default(null),
});

export const updateStatusSchema = z.object({
  status:        z.enum(['confirmed', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled']),
  changedByRole: z.enum(['customer', 'store', 'driver', 'system', 'admin']),
});

export async function createOrder(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof createOrderSchema>;
  const clerkCustomerId = req.headers['x-clerk-user-id'] as string;

  const province = body.deliveryAddress.province as CanadianProvince;
  const taxes = calculateTax(body.subtotal, province);
  const total = body.subtotal + body.deliveryFee + taxes + body.tip;

  const [order] = await db
    .insert(orders)
    .values({
      clerkCustomerId,
      storeId:             body.storeId,
      deliveryAddress:     body.deliveryAddress,
      subtotal:            String(body.subtotal),
      deliveryFee:         String(body.deliveryFee),
      taxes:               String(taxes),
      tip:                 String(body.tip),
      discount:            '0',
      total:               String(total),
      promoCodeUsed:       body.promoCodeUsed,
      specialInstructions: body.specialInstructions,
    })
    .returning();

  if (!order) {
    res.status(500).json({ error: 'Failed to create order' });
    return;
  }

  await db.insert(orderItems).values(
    body.items.map((item) => ({
      orderId:           order.id,
      menuItemId:        item.menuItemId,
      quantity:          item.quantity,
      unitPrice:         String(item.unitPrice),
      selectedModifiers: item.selectedModifiers,
      specialRequests:   item.specialRequests ?? null,
    })),
  );

  await db.insert(orderStatusHistory).values({
    orderId:       order.id,
    status:        'pending',
    changedByRole: 'system',
  });

  await publishEvent(KAFKA_TOPICS.ORDER_CREATED, {
    orderId:         order.id,
    clerkCustomerId,
    storeId:         body.storeId,
    total,
    items:           body.items,
  });

  res.status(201).json({ order });
}

export async function updateOrderStatus(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const { status: newStatus, changedByRole } = req.body as z.infer<typeof updateStatusSchema>;

  const rows = await db.select().from(orders).where(eq(orders.id, id));
  if (rows.length === 0) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  const order = rows[0]!;
  const fsm = new OrderFSM(order.status);

  try {
    fsm.transition(newStatus);
  } catch (err) {
    if (err instanceof InvalidTransitionError) {
      res.status(409).json({ error: err.message });
      return;
    }
    throw err;
  }

  await db.update(orders).set({ status: newStatus, updatedAt: new Date() }).where(eq(orders.id, id));
  await db.insert(orderStatusHistory).values({ orderId: id, status: newStatus, changedByRole });

  await publishEvent(KAFKA_TOPICS.ORDER_STATUS_UPDATED, {
    orderId:         id,
    previousStatus:  order.status,
    newStatus,
    changedByRole:   changedByRole as ChangedByRole,
    clerkCustomerId: order.clerkCustomerId,
    storeId:         order.storeId,
    driverId:        order.driverId,
  });

  if (newStatus === 'delivered') {
    await publishEvent(KAFKA_TOPICS.ORDER_COMPLETED, {
      orderId:               id,
      clerkCustomerId:       order.clerkCustomerId,
      storeId:               order.storeId,
      driverId:              order.driverId ?? '',
      subtotal:              Number(order.subtotal),
      deliveryFee:           Number(order.deliveryFee),
      tip:                   Number(order.tip),
      total:                 Number(order.total),
      stripePaymentIntentId: order.stripePaymentIntentId ?? '',
    });
  }

  if (newStatus === 'cancelled') {
    await publishEvent(KAFKA_TOPICS.ORDER_CANCELLED, {
      orderId:               id,
      clerkCustomerId:       order.clerkCustomerId,
      storeId:               order.storeId,
      driverId:              order.driverId,
      reason:                'Cancelled by ' + changedByRole,
      stripePaymentIntentId: order.stripePaymentIntentId,
    });
  }

  res.json({ order: { ...order, status: newStatus } });
}

export async function getOrderById(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const rows = await db.select().from(orders).where(eq(orders.id, id));
  if (rows.length === 0) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }
  res.json({ order: rows[0] });
}
