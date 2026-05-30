import {
  pgSchema, text, boolean, integer, numeric, timestamp, real, index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const customerSchema = pgSchema('customer_schema');

export const loyaltyTxTypeEnum = customerSchema.enum('loyalty_tx_type', [
  'earned', 'redeemed', 'expired',
]);

export const customerProfiles = customerSchema.table('customer_profiles', {
  id:               text('id').primaryKey().default(sql`gen_random_uuid()`),
  clerkUserId:      text('clerk_user_id').notNull().unique(),
  stripeCustomerId: text('stripe_customer_id'),
  loyaltyPoints:    integer('loyalty_points').notNull().default(0),
  totalOrders:      integer('total_orders').notNull().default(0),
});

export const loyaltyTransactions = customerSchema.table(
  'loyalty_transactions',
  {
    id:           text('id').primaryKey().default(sql`gen_random_uuid()`),
    clerkUserId:  text('clerk_user_id').notNull(),
    orderId:      text('order_id'),
    pointsDelta:  integer('points_delta').notNull(),
    balanceAfter: integer('balance_after').notNull(),
    type:         loyaltyTxTypeEnum('type').notNull(),
    createdAt:    timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('loyalty_user_idx').on(t.clerkUserId),
  }),
);

export const addresses = customerSchema.table(
  'addresses',
  {
    id:          text('id').primaryKey().default(sql`gen_random_uuid()`),
    clerkUserId: text('clerk_user_id').notNull(),
    label:       text('label').notNull().default('Home'),
    street:      text('street').notNull(),
    city:        text('city').notNull(),
    province:    text('province').notNull(),
    postalCode:  text('postal_code').notNull(),
    latitude:    numeric('latitude', { precision: 10, scale: 7 }),
    longitude:   numeric('longitude', { precision: 10, scale: 7 }),
    isDefault:   boolean('is_default').notNull().default(false),
  },
  (t) => ({
    userIdx: index('addresses_user_idx').on(t.clerkUserId),
  }),
);

export const customerFavorites = customerSchema.table('customer_favorites', {
  id:          text('id').primaryKey().default(sql`gen_random_uuid()`),
  clerkUserId: text('clerk_user_id').notNull(),
  storeId:     text('store_id').notNull(),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
});

export const reviews = customerSchema.table('reviews', {
  id:              text('id').primaryKey().default(sql`gen_random_uuid()`),
  orderId:         text('order_id').notNull().unique(),
  clerkCustomerId: text('clerk_customer_id').notNull(),
  storeId:         text('store_id').notNull(),
  driverId:        text('driver_id'),
  storeRating:     real('store_rating').notNull(),
  driverRating:    real('driver_rating'),
  storeComment:    text('store_comment'),
  driverComment:   text('driver_comment'),
  createdAt:       timestamp('created_at').notNull().defaultNow(),
});

export type CustomerProfileInsert = typeof customerProfiles.$inferInsert;
export type AddressInsert = typeof addresses.$inferInsert;
