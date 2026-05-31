import { pgSchema, text, integer, numeric, timestamp, date, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const analyticsSchema = pgSchema('analytics_schema');

export const dailyRevenue = analyticsSchema.table(
  'daily_revenue',
  {
    id:           text('id').primaryKey().default(sql`gen_random_uuid()`),
    date:         date('date').notNull().unique(),
    totalRevenue: numeric('total_revenue', { precision: 12, scale: 2 }).notNull().default('0'),
    platformFees: numeric('platform_fees', { precision: 12, scale: 2 }).notNull().default('0'),
    orderCount:   integer('order_count').notNull().default(0),
    updatedAt:    timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({ dateIdx: index('daily_revenue_date_idx').on(t.date) }),
);

export const storeRevenue = analyticsSchema.table(
  'store_revenue',
  {
    id:           text('id').primaryKey().default(sql`gen_random_uuid()`),
    storeId:      text('store_id').notNull(),
    date:         date('date').notNull(),
    totalRevenue: numeric('total_revenue', { precision: 12, scale: 2 }).notNull().default('0'),
    orderCount:   integer('order_count').notNull().default(0),
    updatedAt:    timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({ storeIdx: index('store_revenue_store_idx').on(t.storeId, t.date) }),
);

export const hourlyOrders = analyticsSchema.table('hourly_orders', {
  id:         text('id').primaryKey().default(sql`gen_random_uuid()`),
  date:       date('date').notNull(),
  hour:       integer('hour').notNull(),
  orderCount: integer('order_count').notNull().default(0),
});

export type DailyRevenueInsert = typeof dailyRevenue.$inferInsert;
export type StoreRevenueInsert = typeof storeRevenue.$inferInsert;
