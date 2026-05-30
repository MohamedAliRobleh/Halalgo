import {
  pgSchema,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const orderSchema = pgSchema('order_schema');

export const orderStatusEnum = orderSchema.enum('order_status', [
  'pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled',
]);

export const changedByRoleEnum = orderSchema.enum('changed_by_role', [
  'customer', 'store', 'driver', 'system', 'admin',
]);

export const orders = orderSchema.table(
  'orders',
  {
    id:                    text('id').primaryKey().default(sql`gen_random_uuid()`),
    clerkCustomerId:       text('clerk_customer_id').notNull(),
    storeId:               text('store_id').notNull(),
    driverId:              text('driver_id'),
    status:                orderStatusEnum('status').notNull().default('pending'),
    deliveryAddress:       jsonb('delivery_address').notNull(),
    subtotal:              numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
    deliveryFee:           numeric('delivery_fee', { precision: 10, scale: 2 }).notNull().default('0'),
    taxes:                 numeric('taxes', { precision: 10, scale: 2 }).notNull().default('0'),
    tip:                   numeric('tip', { precision: 10, scale: 2 }).notNull().default('0'),
    discount:              numeric('discount', { precision: 10, scale: 2 }).notNull().default('0'),
    total:                 numeric('total', { precision: 10, scale: 2 }).notNull(),
    stripePaymentIntentId: text('stripe_payment_intent_id'),
    estimatedDeliveryAt:   timestamp('estimated_delivery_at'),
    deliveredAt:           timestamp('delivered_at'),
    specialInstructions:   text('special_instructions'),
    promoCodeUsed:         text('promo_code_used'),
    deliveryPhotoUrl:      text('delivery_photo_url'),
    createdAt:             timestamp('created_at').notNull().defaultNow(),
    updatedAt:             timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    customerIdx: index('orders_customer_idx').on(t.clerkCustomerId),
    storeIdx:    index('orders_store_idx').on(t.storeId),
    driverIdx:   index('orders_driver_idx').on(t.driverId),
    statusIdx:   index('orders_status_idx').on(t.status),
  }),
);

export const orderItems = orderSchema.table('order_items', {
  id:                text('id').primaryKey().default(sql`gen_random_uuid()`),
  orderId:           text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  menuItemId:        text('menu_item_id').notNull(),
  quantity:          integer('quantity').notNull(),
  unitPrice:         numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  selectedModifiers: jsonb('selected_modifiers').notNull().default(sql`'[]'`),
  specialRequests:   text('special_requests'),
});

export const orderStatusHistory = orderSchema.table(
  'order_status_history',
  {
    id:            text('id').primaryKey().default(sql`gen_random_uuid()`),
    orderId:       text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
    status:        orderStatusEnum('status').notNull(),
    changedAt:     timestamp('changed_at').notNull().defaultNow(),
    changedByRole: changedByRoleEnum('changed_by_role').notNull(),
  },
  (t) => ({
    orderIdx: index('status_history_order_idx').on(t.orderId),
  }),
);

export const orderCancellations = orderSchema.table('order_cancellations', {
  id:              text('id').primaryKey().default(sql`gen_random_uuid()`),
  orderId:         text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }).unique(),
  cancelledByRole: changedByRoleEnum('cancelled_by_role').notNull(),
  reason:          text('reason').notNull(),
  cancelledAt:     timestamp('cancelled_at').notNull().defaultNow(),
});

export type OrderInsert = typeof orders.$inferInsert;
export type OrderSelect = typeof orders.$inferSelect;
