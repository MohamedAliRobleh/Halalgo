import {
  pgSchema,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  smallint,
  real,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const storeSchema = pgSchema('store_schema');

export const storeTypeEnum = storeSchema.enum('store_type', ['restaurant', 'grocery']);

export const stores = storeSchema.table(
  'stores',
  {
    id:                  text('id').primaryKey().default(sql`gen_random_uuid()`),
    clerkUserId:         text('clerk_user_id').notNull().unique(),
    name:                text('name').notNull(),
    description:         text('description').notNull().default(''),
    logoUrl:             text('logo_url').notNull().default(''),
    coverUrl:            text('cover_url').notNull().default(''),
    address:             text('address').notNull(),
    city:                text('city').notNull(),
    province:            text('province').notNull(),
    postalCode:          text('postal_code').notNull(),
    latitude:            numeric('latitude', { precision: 10, scale: 7 }),
    longitude:           numeric('longitude', { precision: 10, scale: 7 }),
    storeType:           storeTypeEnum('store_type').notNull(),
    cuisineType:         text('cuisine_type'),
    halalCertificateUrl: text('halal_certificate_url'),
    isVerified:          boolean('is_verified').notNull().default(false),
    isOpen:              boolean('is_open').notNull().default(false),
    rating:              real('rating').notNull().default(0),
    deliveryFee:         numeric('delivery_fee', { precision: 10, scale: 2 }).notNull().default('0'),
    minOrder:            numeric('min_order', { precision: 10, scale: 2 }).notNull().default('0'),
    deliveryTimeMin:     integer('delivery_time_min').notNull().default(30),
    stripeAccountId:     text('stripe_account_id'),
    createdAt:           timestamp('created_at').notNull().defaultNow(),
    updatedAt:           timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    storeTypeIdx: index('stores_store_type_idx').on(t.storeType),
    isOpenIdx:    index('stores_is_open_idx').on(t.isOpen),
    cityIdx:      index('stores_city_idx').on(t.city),
  }),
);

export const storeHours = storeSchema.table('store_hours', {
  id:        text('id').primaryKey().default(sql`gen_random_uuid()`),
  storeId:   text('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  dayOfWeek: smallint('day_of_week').notNull(),
  openTime:  text('open_time').notNull(),
  closeTime: text('close_time').notNull(),
  isClosed:  boolean('is_closed').notNull().default(false),
});

export const groceryCategories = storeSchema.table('grocery_categories', {
  id:       text('id').primaryKey().default(sql`gen_random_uuid()`),
  name:     text('name').notNull().unique(),
  icon:     text('icon').notNull(),
  position: integer('position').notNull().default(0),
});

export const menuCategories = storeSchema.table('menu_categories', {
  id:                text('id').primaryKey().default(sql`gen_random_uuid()`),
  storeId:           text('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  groceryCategoryId: text('grocery_category_id').references(() => groceryCategories.id),
  name:              text('name').notNull(),
  description:       text('description'),
  imageUrl:          text('image_url'),
  position:          integer('position').notNull().default(0),
  isActive:          boolean('is_active').notNull().default(true),
});

export const menuItems = storeSchema.table(
  'menu_items',
  {
    id:          text('id').primaryKey().default(sql`gen_random_uuid()`),
    categoryId:  text('category_id').notNull().references(() => menuCategories.id, { onDelete: 'cascade' }),
    storeId:     text('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
    name:        text('name').notNull(),
    description: text('description'),
    basePrice:   numeric('base_price', { precision: 10, scale: 2 }).notNull(),
    imageUrl:    text('image_url'),
    isAvailable: boolean('is_available').notNull().default(true),
    isFeatured:  boolean('is_featured').notNull().default(false),
    prepTimeMin: integer('prep_time_min').notNull().default(10),
    allergens:   text('allergens').array().notNull().default(sql`'{}'`),
    calories:    integer('calories'),
  },
  (t) => ({
    storeIdx: index('menu_items_store_idx').on(t.storeId),
  }),
);

export const modifierGroups = storeSchema.table('modifier_groups', {
  id:            text('id').primaryKey().default(sql`gen_random_uuid()`),
  menuItemId:    text('menu_item_id').notNull().references(() => menuItems.id, { onDelete: 'cascade' }),
  name:          text('name').notNull(),
  isRequired:    boolean('is_required').notNull().default(false),
  minSelections: integer('min_selections').notNull().default(0),
  maxSelections: integer('max_selections').notNull().default(1),
  position:      integer('position').notNull().default(0),
});

export const modifiers = storeSchema.table('modifiers', {
  id:          text('id').primaryKey().default(sql`gen_random_uuid()`),
  groupId:     text('group_id').notNull().references(() => modifierGroups.id, { onDelete: 'cascade' }),
  name:        text('name').notNull(),
  priceDelta:  numeric('price_delta', { precision: 10, scale: 2 }).notNull().default('0'),
  isAvailable: boolean('is_available').notNull().default(true),
  position:    integer('position').notNull().default(0),
});

export const deliveryZones = storeSchema.table('delivery_zones', {
  id:               text('id').primaryKey().default(sql`gen_random_uuid()`),
  storeId:          text('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  zonePolygonJson:  text('zone_polygon_json').notNull(),
  deliveryFee:      numeric('delivery_fee', { precision: 10, scale: 2 }).notNull().default('0'),
  minOrder:         numeric('min_order', { precision: 10, scale: 2 }).notNull().default('0'),
});

export const surgePricingEvents = storeSchema.table(
  'surge_pricing_events',
  {
    id:              text('id').primaryKey().default(sql`gen_random_uuid()`),
    zonePolygonJson: text('zone_polygon_json').notNull(),
    multiplier:      real('multiplier').notNull().default(1.0),
    startsAt:        timestamp('starts_at').notNull(),
    endsAt:          timestamp('ends_at').notNull(),
    reason:          text('reason').notNull(),
    isActive:        boolean('is_active').notNull().default(true),
  },
  (t) => ({
    isActiveIdx: index('surge_active_idx').on(t.isActive),
  }),
);

export type StoreInsert = typeof stores.$inferInsert;
export type StoreSelect = typeof stores.$inferSelect;
export type MenuItemInsert = typeof menuItems.$inferInsert;
export type MenuItemSelect = typeof menuItems.$inferSelect;
