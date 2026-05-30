import {
  pgSchema, text, boolean, integer, numeric, timestamp, real, index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const driverSchema = pgSchema('driver_schema');

export const vehicleTypeEnum = driverSchema.enum('vehicle_type', [
  'car', 'motorcycle', 'bicycle', 'scooter',
]);

export const dispatchResponseEnum = driverSchema.enum('dispatch_response', [
  'accepted', 'declined', 'timeout',
]);

export const driverProfiles = driverSchema.table(
  'driver_profiles',
  {
    id:                text('id').primaryKey().default(sql`gen_random_uuid()`),
    clerkUserId:       text('clerk_user_id').notNull().unique(),
    vehicleType:       vehicleTypeEnum('vehicle_type').notNull(),
    licensePlate:      text('license_plate').notNull(),
    driversLicenseUrl: text('drivers_license_url'),
    insuranceUrl:      text('insurance_url'),
    isAvailable:       boolean('is_available').notNull().default(false),
    isVerified:        boolean('is_verified').notNull().default(false),
    latitude:          numeric('latitude', { precision: 10, scale: 7 }),
    longitude:         numeric('longitude', { precision: 10, scale: 7 }),
    rating:            real('rating').notNull().default(5.0),
    totalDeliveries:   integer('total_deliveries').notNull().default(0),
    stripeAccountId:   text('stripe_account_id'),
  },
  (t) => ({
    isAvailableIdx: index('driver_available_idx').on(t.isAvailable),
  }),
);

export const driverDispatchLog = driverSchema.table(
  'driver_dispatch_log',
  {
    id:             text('id').primaryKey().default(sql`gen_random_uuid()`),
    orderId:        text('order_id').notNull(),
    driverId:       text('driver_id').notNull().references(() => driverProfiles.id),
    offeredAt:      timestamp('offered_at').notNull().defaultNow(),
    response:       dispatchResponseEnum('response').notNull(),
    declinedReason: text('declined_reason'),
  },
  (t) => ({
    orderIdx:  index('dispatch_order_idx').on(t.orderId),
    driverIdx: index('dispatch_driver_idx').on(t.driverId),
  }),
);

export const driverEarnings = driverSchema.table(
  'driver_earnings',
  {
    id:                 text('id').primaryKey().default(sql`gen_random_uuid()`),
    driverId:           text('driver_id').notNull().references(() => driverProfiles.id),
    orderId:            text('order_id').notNull().unique(),
    deliveryFeeEarned:  numeric('delivery_fee_earned', { precision: 10, scale: 2 }).notNull(),
    tipEarned:          numeric('tip_earned', { precision: 10, scale: 2 }).notNull().default('0'),
    platformCommission: numeric('platform_commission', { precision: 10, scale: 2 }).notNull(),
    netPayout:          numeric('net_payout', { precision: 10, scale: 2 }).notNull(),
    paidAt:             timestamp('paid_at'),
  },
  (t) => ({
    driverIdx: index('earnings_driver_idx').on(t.driverId),
    paidIdx:   index('earnings_paid_idx').on(t.paidAt),
  }),
);

export type DriverProfileInsert = typeof driverProfiles.$inferInsert;
export type DriverProfileSelect = typeof driverProfiles.$inferSelect;
