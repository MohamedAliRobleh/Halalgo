import {
  pgSchema, text, boolean, integer, numeric, timestamp, index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const paymentSchema = pgSchema('payment_schema');

export const transactionStatusEnum = paymentSchema.enum('transaction_status', [
  'pending', 'succeeded', 'failed', 'refunded',
]);

export const promotionTypeEnum = paymentSchema.enum('promotion_type', [
  'percentage', 'fixed', 'free_delivery',
]);

export const refundInitiatorEnum = paymentSchema.enum('refund_initiator', [
  'customer', 'admin', 'system',
]);

export const transactions = paymentSchema.table(
  'transactions',
  {
    id:                    text('id').primaryKey().default(sql`gen_random_uuid()`),
    orderId:               text('order_id').notNull().unique(),
    stripePaymentIntentId: text('stripe_payment_intent_id').notNull().unique(),
    amount:                numeric('amount', { precision: 10, scale: 2 }).notNull(),
    status:                transactionStatusEnum('status').notNull().default('pending'),
    platformFee:           numeric('platform_fee', { precision: 10, scale: 2 }).notNull(),
    storePayout:           numeric('store_payout', { precision: 10, scale: 2 }).notNull(),
    driverPayout:          numeric('driver_payout', { precision: 10, scale: 2 }).notNull(),
    createdAt:             timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    orderIdx: index('transactions_order_idx').on(t.orderId),
  }),
);

export const refunds = paymentSchema.table('refunds', {
  id:              text('id').primaryKey().default(sql`gen_random_uuid()`),
  orderId:         text('order_id').notNull(),
  transactionId:   text('transaction_id').notNull().references(() => transactions.id),
  amount:          numeric('amount', { precision: 10, scale: 2 }).notNull(),
  reason:          text('reason').notNull(),
  stripeRefundId:  text('stripe_refund_id').notNull().unique(),
  initiatedByRole: refundInitiatorEnum('initiated_by_role').notNull(),
  createdAt:       timestamp('created_at').notNull().defaultNow(),
});

export const promotions = paymentSchema.table('promotions', {
  id:        text('id').primaryKey().default(sql`gen_random_uuid()`),
  storeId:   text('store_id'),
  code:      text('code').notNull().unique(),
  type:      promotionTypeEnum('type').notNull(),
  value:     numeric('value', { precision: 10, scale: 2 }).notNull(),
  minOrder:  numeric('min_order', { precision: 10, scale: 2 }).notNull().default('0'),
  maxUses:   integer('max_uses'),
  usesCount: integer('uses_count').notNull().default(0),
  expiresAt: timestamp('expires_at'),
  isActive:  boolean('is_active').notNull().default(true),
});

export type TransactionInsert = typeof transactions.$inferInsert;
export type PromotionSelect = typeof promotions.$inferSelect;
