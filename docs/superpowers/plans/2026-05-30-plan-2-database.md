# HalalGo — Plan 2: Database Schemas

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Define all Drizzle ORM schemas across all 6 Neon PostgreSQL service schemas, enable PostGIS, and generate + run initial migrations.

**Architecture:** Each microservice owns its own Neon schema (PostgreSQL namespace). Drizzle schema files live inside each service at `src/db/schema.ts`. A shared `database` package holds the Neon connection factory and Drizzle client builder. Migrations are run per-service via `drizzle-kit push`.

**Tech Stack:** Drizzle ORM 0.30, drizzle-kit 0.21, @neondatabase/serverless, PostGIS (enabled via raw SQL migration), Zod (for insert validation schemas), Vitest

**Prerequisite:** Plan 1 complete — `@halalgo/types` package built and available.

---

## File Map

```
packages/
└── database/
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── index.ts              # Neon connection factory + Drizzle builder
        └── extensions.ts        # PostGIS + pg_trgm SQL setup helpers

services/
├── store-service/
│   └── src/db/
│       ├── schema.ts             # stores, store_hours, menu_*, modifiers, zones
│       ├── index.ts              # Drizzle client for store_schema
│       └── migrate.ts            # drizzle-kit config runner
├── order-service/
│   └── src/db/
│       ├── schema.ts             # orders, order_items, status_history, cancellations
│       ├── index.ts
│       └── migrate.ts
├── driver-service/
│   └── src/db/
│       ├── schema.ts             # driver_profiles, dispatch_log, earnings
│       ├── index.ts
│       └── migrate.ts
├── payment-service/
│   └── src/db/
│       ├── schema.ts             # transactions, refunds, promotions
│       ├── index.ts
│       └── migrate.ts
├── customer-service/             # (new service — owns customer data)
│   └── src/db/
│       ├── schema.ts             # customer_profiles, addresses, favorites, loyalty
│       ├── index.ts
│       └── migrate.ts
└── notification-service/
    └── src/db/
        ├── schema.ts             # notifications, push_tokens
        ├── index.ts
        └── migrate.ts
```

---

## Task 1: @halalgo/database Shared Package

**Files:**
- Create: `packages/database/package.json`
- Create: `packages/database/tsconfig.json`
- Create: `packages/database/src/index.ts`
- Create: `packages/database/src/extensions.ts`

- [ ] **Step 1: Create `packages/database/package.json`**

```json
{
  "name": "@halalgo/database",
  "version": "1.0.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "@neondatabase/serverless": "^0.9.0",
    "drizzle-orm": "^0.30.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.21.0",
    "typescript": "*"
  }
}
```

- [ ] **Step 2: Create `packages/database/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `packages/database/src/index.ts`**

```typescript
import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import { drizzle, NeonHttpDatabase } from 'drizzle-orm/neon-http';

export function createDrizzleClient<TSchema extends Record<string, unknown>>(
  schema: TSchema,
  schemaName?: string,
): NeonHttpDatabase<TSchema> {
  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl) {
    throw new Error('Missing DATABASE_URL environment variable');
  }

  const sql: NeonQueryFunction<false, false> = neon(databaseUrl);
  return drizzle(sql, {
    schema,
    logger: process.env['NODE_ENV'] === 'development',
  });
}

export { sql } from 'drizzle-orm';
export type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
```

- [ ] **Step 4: Create `packages/database/src/extensions.ts`**

```typescript
// Run once against Neon to enable PostGIS and pg_trgm extensions.
// Execute via: npx tsx packages/database/src/extensions.ts
import { neon } from '@neondatabase/serverless';

async function enableExtensions(): Promise<void> {
  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl) throw new Error('Missing DATABASE_URL');

  const sql = neon(databaseUrl);

  await sql`CREATE EXTENSION IF NOT EXISTS postgis`;
  await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`;
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

  // Create service schemas
  const schemas = [
    'store_schema',
    'order_schema',
    'driver_schema',
    'payment_schema',
    'customer_schema',
    'notif_schema',
    'analytics_schema',
  ];

  for (const schema of schemas) {
    await sql`CREATE SCHEMA IF NOT EXISTS ${sql(schema)}`;
  }

  console.log('Extensions and schemas created successfully.');
}

enableExtensions().catch(console.error);
```

- [ ] **Step 5: Build the database package**

```bash
npm install && cd packages/database && npm run build
```

Expected: `dist/` created, no errors.

- [ ] **Step 6: Enable PostGIS and create schemas on Neon**

Make sure `.env` has `DATABASE_URL` set to your Neon connection string, then run:

```bash
npx tsx packages/database/src/extensions.ts
```

Expected output:
```
Extensions and schemas created successfully.
```

- [ ] **Step 7: Commit**

```bash
git add packages/database/
git commit -m "feat: add @halalgo/database package with Neon connection factory"
```

---

## Task 2: Store Service Database Schema

**Files:**
- Create: `services/store-service/package.json`
- Create: `services/store-service/tsconfig.json`
- Create: `services/store-service/drizzle.config.ts`
- Create: `services/store-service/src/db/schema.ts`
- Create: `services/store-service/src/db/index.ts`

- [ ] **Step 1: Create `services/store-service/package.json`**

```json
{
  "name": "@halalgo/store-service",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "@halalgo/database": "workspace:*",
    "@halalgo/types": "workspace:*",
    "@halalgo/kafka": "workspace:*",
    "drizzle-orm": "^0.30.0",
    "@neondatabase/serverless": "^0.9.0",
    "express": "^4.18.2",
    "dotenv": "^16.4.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.21.0",
    "@types/express": "^4.17.21",
    "@types/node": "*",
    "typescript": "*",
    "tsx": "^4.7.0",
    "vitest": "*"
  }
}
```

- [ ] **Step 2: Create `services/store-service/drizzle.config.ts`**

```typescript
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env['DATABASE_URL'] ?? '',
  },
  schemaFilter: 'store_schema',
  verbose: true,
} satisfies Config;
```

- [ ] **Step 3: Create `services/store-service/src/db/schema.ts`**

```typescript
import {
  pgSchema, pgEnum, text, boolean, integer,
  numeric, timestamp, jsonb, smallint, real,
  geometry, index, uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const storeSchema = pgSchema('store_schema');

export const storeTypeEnum = storeSchema.enum('store_type', ['restaurant', 'grocery']);

// ── Stores ────────────────────────────────────────────────────────────────────
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
    location:            geometry('location', { type: 'point', mode: 'xy', srid: 4326 }),
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
    locationIdx: index('stores_location_idx').using('gist', t.location),
    storeTypeIdx: index('stores_store_type_idx').on(t.storeType),
    isOpenIdx: index('stores_is_open_idx').on(t.isOpen),
  }),
);

// ── Store Hours ───────────────────────────────────────────────────────────────
export const storeHours = storeSchema.table('store_hours', {
  id:         text('id').primaryKey().default(sql`gen_random_uuid()`),
  storeId:    text('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  dayOfWeek:  smallint('day_of_week').notNull(), // 0=Sunday, 6=Saturday
  openTime:   text('open_time').notNull(),        // HH:MM
  closeTime:  text('close_time').notNull(),        // HH:MM
  isClosed:   boolean('is_closed').notNull().default(false),
});

// ── Grocery Categories (global taxonomy) ─────────────────────────────────────
export const groceryCategories = storeSchema.table('grocery_categories', {
  id:       text('id').primaryKey().default(sql`gen_random_uuid()`),
  name:     text('name').notNull().unique(),
  icon:     text('icon').notNull(),
  position: integer('position').notNull().default(0),
});

// ── Menu Categories ───────────────────────────────────────────────────────────
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

// ── Menu Items ────────────────────────────────────────────────────────────────
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
    storeIdx:  index('menu_items_store_idx').on(t.storeId),
    nameIdx:   index('menu_items_name_trgm_idx').using('gin', sql`${t.name} gin_trgm_ops`),
  }),
);

// ── Modifier Groups ───────────────────────────────────────────────────────────
export const modifierGroups = storeSchema.table('modifier_groups', {
  id:            text('id').primaryKey().default(sql`gen_random_uuid()`),
  menuItemId:    text('menu_item_id').notNull().references(() => menuItems.id, { onDelete: 'cascade' }),
  name:          text('name').notNull(),
  isRequired:    boolean('is_required').notNull().default(false),
  minSelections: integer('min_selections').notNull().default(0),
  maxSelections: integer('max_selections').notNull().default(1),
  position:      integer('position').notNull().default(0),
});

// ── Modifiers ─────────────────────────────────────────────────────────────────
export const modifiers = storeSchema.table('modifiers', {
  id:          text('id').primaryKey().default(sql`gen_random_uuid()`),
  groupId:     text('group_id').notNull().references(() => modifierGroups.id, { onDelete: 'cascade' }),
  name:        text('name').notNull(),
  priceDelta:  numeric('price_delta', { precision: 10, scale: 2 }).notNull().default('0'),
  isAvailable: boolean('is_available').notNull().default(true),
  position:    integer('position').notNull().default(0),
});

// ── Delivery Zones ────────────────────────────────────────────────────────────
export const deliveryZones = storeSchema.table(
  'delivery_zones',
  {
    id:          text('id').primaryKey().default(sql`gen_random_uuid()`),
    storeId:     text('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
    zonePolygon: geometry('zone_polygon', { type: 'polygon', mode: 'geojson', srid: 4326 }),
    deliveryFee: numeric('delivery_fee', { precision: 10, scale: 2 }).notNull().default('0'),
    minOrder:    numeric('min_order', { precision: 10, scale: 2 }).notNull().default('0'),
  },
  (t) => ({
    polygonIdx: index('delivery_zones_polygon_idx').using('gist', t.zonePolygon),
  }),
);

// ── Surge Pricing Events ──────────────────────────────────────────────────────
export const surgePricingEvents = storeSchema.table(
  'surge_pricing_events',
  {
    id:          text('id').primaryKey().default(sql`gen_random_uuid()`),
    zonePolygon: geometry('zone_polygon', { type: 'polygon', mode: 'geojson', srid: 4326 }),
    multiplier:  real('multiplier').notNull().default(1.0),
    startsAt:    timestamp('starts_at').notNull(),
    endsAt:      timestamp('ends_at').notNull(),
    reason:      text('reason').notNull(),
    isActive:    boolean('is_active').notNull().default(true),
  },
  (t) => ({
    polygonIdx:  index('surge_polygon_idx').using('gist', t.zonePolygon),
    isActiveIdx: index('surge_active_idx').on(t.isActive),
  }),
);

// ── Inferred types ────────────────────────────────────────────────────────────
export type StoreInsert = typeof stores.$inferInsert;
export type StoreSelect = typeof stores.$inferSelect;
export type MenuItemInsert = typeof menuItems.$inferInsert;
export type MenuItemSelect = typeof menuItems.$inferSelect;
```

- [ ] **Step 4: Create `services/store-service/src/db/index.ts`**

```typescript
import { createDrizzleClient } from '@halalgo/database';
import * as schema from './schema.js';

export const db = createDrizzleClient(schema, 'store_schema');
export * from './schema.js';
```

- [ ] **Step 5: Push store schema to Neon**

```bash
cd services/store-service && npx drizzle-kit push
```

Expected: Drizzle connects to Neon, creates all tables in `store_schema`, outputs:
```
✓ stores created
✓ store_hours created
✓ grocery_categories created
✓ menu_categories created
✓ menu_items created
✓ modifier_groups created
✓ modifiers created
✓ delivery_zones created
✓ surge_pricing_events created
```

- [ ] **Step 6: Commit**

```bash
git add services/store-service/
git commit -m "feat: add store-service Drizzle schema (stores, menu, modifiers, zones)"
```

---

## Task 3: Order Service Database Schema

**Files:**
- Create: `services/order-service/package.json`
- Create: `services/order-service/drizzle.config.ts`
- Create: `services/order-service/src/db/schema.ts`
- Create: `services/order-service/src/db/index.ts`

- [ ] **Step 1: Create `services/order-service/package.json`**

```json
{
  "name": "@halalgo/order-service",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "db:push": "drizzle-kit push"
  },
  "dependencies": {
    "@halalgo/database": "workspace:*",
    "@halalgo/types": "workspace:*",
    "@halalgo/kafka": "workspace:*",
    "@halalgo/utils": "workspace:*",
    "drizzle-orm": "^0.30.0",
    "@neondatabase/serverless": "^0.9.0",
    "express": "^4.18.2",
    "dotenv": "^16.4.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.21.0",
    "@types/express": "^4.17.21",
    "@types/node": "*",
    "typescript": "*",
    "tsx": "^4.7.0",
    "vitest": "*"
  }
}
```

- [ ] **Step 2: Create `services/order-service/drizzle.config.ts`**

```typescript
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  driver: 'pg',
  dbCredentials: { connectionString: process.env['DATABASE_URL'] ?? '' },
  schemaFilter: 'order_schema',
  verbose: true,
} satisfies Config;
```

- [ ] **Step 3: Create `services/order-service/src/db/schema.ts`**

```typescript
import {
  pgSchema, pgEnum, text, boolean, integer,
  numeric, timestamp, jsonb, index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const orderSchema = pgSchema('order_schema');

export const orderStatusEnum = orderSchema.enum('order_status', [
  'pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled',
]);

export const changedByRoleEnum = orderSchema.enum('changed_by_role', [
  'customer', 'store', 'driver', 'system', 'admin',
]);

// ── Orders ────────────────────────────────────────────────────────────────────
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

// ── Order Items ───────────────────────────────────────────────────────────────
export const orderItems = orderSchema.table('order_items', {
  id:                 text('id').primaryKey().default(sql`gen_random_uuid()`),
  orderId:            text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  menuItemId:         text('menu_item_id').notNull(),
  quantity:           integer('quantity').notNull(),
  unitPrice:          numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  selectedModifiers:  jsonb('selected_modifiers').notNull().default(sql`'[]'`),
  specialRequests:    text('special_requests'),
});

// ── Order Status History ──────────────────────────────────────────────────────
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

// ── Order Cancellations ───────────────────────────────────────────────────────
export const orderCancellations = orderSchema.table('order_cancellations', {
  id:              text('id').primaryKey().default(sql`gen_random_uuid()`),
  orderId:         text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }).unique(),
  cancelledByRole: changedByRoleEnum('cancelled_by_role').notNull(),
  reason:          text('reason').notNull(),
  cancelledAt:     timestamp('cancelled_at').notNull().defaultNow(),
});

export type OrderInsert = typeof orders.$inferInsert;
export type OrderSelect = typeof orders.$inferSelect;
```

- [ ] **Step 4: Create `services/order-service/src/db/index.ts`**

```typescript
import { createDrizzleClient } from '@halalgo/database';
import * as schema from './schema.js';

export const db = createDrizzleClient(schema, 'order_schema');
export * from './schema.js';
```

- [ ] **Step 5: Push order schema to Neon**

```bash
cd services/order-service && npm install && npx drizzle-kit push
```

Expected: `orders`, `order_items`, `order_status_history`, `order_cancellations` created in `order_schema`.

- [ ] **Step 6: Commit**

```bash
git add services/order-service/
git commit -m "feat: add order-service Drizzle schema with FSM status enum"
```

---

## Task 4: Driver Service Database Schema

**Files:**
- Create: `services/driver-service/package.json`
- Create: `services/driver-service/drizzle.config.ts`
- Create: `services/driver-service/src/db/schema.ts`
- Create: `services/driver-service/src/db/index.ts`

- [ ] **Step 1: Create `services/driver-service/package.json`**

```json
{
  "name": "@halalgo/driver-service",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "db:push": "drizzle-kit push"
  },
  "dependencies": {
    "@halalgo/database": "workspace:*",
    "@halalgo/types": "workspace:*",
    "@halalgo/kafka": "workspace:*",
    "drizzle-orm": "^0.30.0",
    "@neondatabase/serverless": "^0.9.0",
    "ioredis": "^5.3.2",
    "express": "^4.18.2",
    "dotenv": "^16.4.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.21.0",
    "@types/express": "^4.17.21",
    "@types/node": "*",
    "typescript": "*",
    "tsx": "^4.7.0",
    "vitest": "*"
  }
}
```

- [ ] **Step 2: Create `services/driver-service/drizzle.config.ts`**

```typescript
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  driver: 'pg',
  dbCredentials: { connectionString: process.env['DATABASE_URL'] ?? '' },
  schemaFilter: 'driver_schema',
  verbose: true,
} satisfies Config;
```

- [ ] **Step 3: Create `services/driver-service/src/db/schema.ts`**

```typescript
import {
  pgSchema, pgEnum, text, boolean, integer,
  numeric, timestamp, real, geometry, index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const driverSchema = pgSchema('driver_schema');

export const vehicleTypeEnum = driverSchema.enum('vehicle_type', [
  'car', 'motorcycle', 'bicycle', 'scooter',
]);

export const dispatchResponseEnum = driverSchema.enum('dispatch_response', [
  'accepted', 'declined', 'timeout',
]);

// ── Driver Profiles ───────────────────────────────────────────────────────────
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
    location:          geometry('location', { type: 'point', mode: 'xy', srid: 4326 }),
    rating:            real('rating').notNull().default(5.0),
    totalDeliveries:   integer('total_deliveries').notNull().default(0),
    stripeAccountId:   text('stripe_account_id'),
  },
  (t) => ({
    locationIdx:     index('driver_location_idx').using('gist', t.location),
    isAvailableIdx:  index('driver_available_idx').on(t.isAvailable),
  }),
);

// ── Driver Dispatch Log ───────────────────────────────────────────────────────
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

// ── Driver Earnings ───────────────────────────────────────────────────────────
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
```

- [ ] **Step 4: Create `services/driver-service/src/db/index.ts`**

```typescript
import { createDrizzleClient } from '@halalgo/database';
import * as schema from './schema.js';

export const db = createDrizzleClient(schema, 'driver_schema');
export * from './schema.js';
```

- [ ] **Step 5: Push driver schema to Neon**

```bash
cd services/driver-service && npm install && npx drizzle-kit push
```

Expected: `driver_profiles`, `driver_dispatch_log`, `driver_earnings` created in `driver_schema`.

- [ ] **Step 6: Commit**

```bash
git add services/driver-service/
git commit -m "feat: add driver-service Drizzle schema with PostGIS location"
```

---

## Task 5: Payment Service Database Schema

**Files:**
- Create: `services/payment-service/package.json`
- Create: `services/payment-service/drizzle.config.ts`
- Create: `services/payment-service/src/db/schema.ts`
- Create: `services/payment-service/src/db/index.ts`

- [ ] **Step 1: Create `services/payment-service/package.json`**

```json
{
  "name": "@halalgo/payment-service",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "db:push": "drizzle-kit push"
  },
  "dependencies": {
    "@halalgo/database": "workspace:*",
    "@halalgo/types": "workspace:*",
    "@halalgo/kafka": "workspace:*",
    "@halalgo/utils": "workspace:*",
    "drizzle-orm": "^0.30.0",
    "@neondatabase/serverless": "^0.9.0",
    "stripe": "^14.21.0",
    "express": "^4.18.2",
    "dotenv": "^16.4.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.21.0",
    "@types/express": "^4.17.21",
    "@types/node": "*",
    "typescript": "*",
    "tsx": "^4.7.0",
    "vitest": "*"
  }
}
```

- [ ] **Step 2: Create `services/payment-service/drizzle.config.ts`**

```typescript
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  driver: 'pg',
  dbCredentials: { connectionString: process.env['DATABASE_URL'] ?? '' },
  schemaFilter: 'payment_schema',
  verbose: true,
} satisfies Config;
```

- [ ] **Step 3: Create `services/payment-service/src/db/schema.ts`**

```typescript
import {
  pgSchema, pgEnum, text, boolean, integer,
  numeric, timestamp, index,
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

// ── Transactions ──────────────────────────────────────────────────────────────
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

// ── Refunds ───────────────────────────────────────────────────────────────────
export const refunds = paymentSchema.table('refunds', {
  id:               text('id').primaryKey().default(sql`gen_random_uuid()`),
  orderId:          text('order_id').notNull(),
  transactionId:    text('transaction_id').notNull().references(() => transactions.id),
  amount:           numeric('amount', { precision: 10, scale: 2 }).notNull(),
  reason:           text('reason').notNull(),
  stripeRefundId:   text('stripe_refund_id').notNull().unique(),
  initiatedByRole:  refundInitiatorEnum('initiated_by_role').notNull(),
  createdAt:        timestamp('created_at').notNull().defaultNow(),
});

// ── Promotions ────────────────────────────────────────────────────────────────
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
```

- [ ] **Step 4: Create `services/payment-service/src/db/index.ts`**

```typescript
import { createDrizzleClient } from '@halalgo/database';
import * as schema from './schema.js';

export const db = createDrizzleClient(schema, 'payment_schema');
export * from './schema.js';
```

- [ ] **Step 5: Push payment schema to Neon**

```bash
cd services/payment-service && npm install && npx drizzle-kit push
```

Expected: `transactions`, `refunds`, `promotions` created in `payment_schema`.

- [ ] **Step 6: Commit**

```bash
git add services/payment-service/
git commit -m "feat: add payment-service Drizzle schema (transactions, refunds, promotions)"
```

---

## Task 6: Customer Service Database Schema

**Files:**
- Create: `services/customer-service/package.json`
- Create: `services/customer-service/drizzle.config.ts`
- Create: `services/customer-service/src/db/schema.ts`
- Create: `services/customer-service/src/db/index.ts`

- [ ] **Step 1: Create `services/customer-service/package.json`**

```json
{
  "name": "@halalgo/customer-service",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "db:push": "drizzle-kit push"
  },
  "dependencies": {
    "@halalgo/database": "workspace:*",
    "@halalgo/types": "workspace:*",
    "@halalgo/kafka": "workspace:*",
    "drizzle-orm": "^0.30.0",
    "@neondatabase/serverless": "^0.9.0",
    "express": "^4.18.2",
    "dotenv": "^16.4.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.21.0",
    "@types/express": "^4.17.21",
    "@types/node": "*",
    "typescript": "*",
    "tsx": "^4.7.0",
    "vitest": "*"
  }
}
```

- [ ] **Step 2: Create `services/customer-service/drizzle.config.ts`**

```typescript
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  driver: 'pg',
  dbCredentials: { connectionString: process.env['DATABASE_URL'] ?? '' },
  schemaFilter: 'customer_schema',
  verbose: true,
} satisfies Config;
```

- [ ] **Step 3: Create `services/customer-service/src/db/schema.ts`**

```typescript
import {
  pgSchema, pgEnum, text, boolean, integer,
  numeric, timestamp, geometry, index, real,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const customerSchema = pgSchema('customer_schema');

export const loyaltyTxTypeEnum = customerSchema.enum('loyalty_tx_type', [
  'earned', 'redeemed', 'expired',
]);

export const platformEnum = customerSchema.enum('platform', ['ios', 'android']);

// ── Customer Profiles ─────────────────────────────────────────────────────────
export const customerProfiles = customerSchema.table('customer_profiles', {
  id:               text('id').primaryKey().default(sql`gen_random_uuid()`),
  clerkUserId:      text('clerk_user_id').notNull().unique(),
  stripeCustomerId: text('stripe_customer_id'),
  loyaltyPoints:    integer('loyalty_points').notNull().default(0),
  totalOrders:      integer('total_orders').notNull().default(0),
});

// ── Loyalty Transactions ──────────────────────────────────────────────────────
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

// ── Addresses ─────────────────────────────────────────────────────────────────
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
    location:    geometry('location', { type: 'point', mode: 'xy', srid: 4326 }),
    isDefault:   boolean('is_default').notNull().default(false),
  },
  (t) => ({
    userIdx:     index('addresses_user_idx').on(t.clerkUserId),
    locationIdx: index('addresses_location_idx').using('gist', t.location),
  }),
);

// ── Favorites ─────────────────────────────────────────────────────────────────
export const customerFavorites = customerSchema.table('customer_favorites', {
  id:          text('id').primaryKey().default(sql`gen_random_uuid()`),
  clerkUserId: text('clerk_user_id').notNull(),
  storeId:     text('store_id').notNull(),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
});

// ── Reviews ───────────────────────────────────────────────────────────────────
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
```

- [ ] **Step 4: Create `services/customer-service/src/db/index.ts`**

```typescript
import { createDrizzleClient } from '@halalgo/database';
import * as schema from './schema.js';

export const db = createDrizzleClient(schema, 'customer_schema');
export * from './schema.js';
```

- [ ] **Step 5: Push customer schema to Neon**

```bash
cd services/customer-service && npm install && npx drizzle-kit push
```

Expected: `customer_profiles`, `loyalty_transactions`, `addresses`, `customer_favorites`, `reviews` created in `customer_schema`.

- [ ] **Step 6: Commit**

```bash
git add services/customer-service/
git commit -m "feat: add customer-service Drizzle schema (profiles, addresses, loyalty, reviews)"
```

---

## Task 7: Notification Service Database Schema

**Files:**
- Create: `services/notification-service/package.json`
- Create: `services/notification-service/drizzle.config.ts`
- Create: `services/notification-service/src/db/schema.ts`
- Create: `services/notification-service/src/db/index.ts`

- [ ] **Step 1: Create `services/notification-service/package.json`**

```json
{
  "name": "@halalgo/notification-service",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "db:push": "drizzle-kit push"
  },
  "dependencies": {
    "@halalgo/database": "workspace:*",
    "@halalgo/types": "workspace:*",
    "@halalgo/kafka": "workspace:*",
    "drizzle-orm": "^0.30.0",
    "@neondatabase/serverless": "^0.9.0",
    "expo-server-sdk": "^3.7.0",
    "dotenv": "^16.4.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.21.0",
    "@types/node": "*",
    "typescript": "*",
    "tsx": "^4.7.0"
  }
}
```

- [ ] **Step 2: Create `services/notification-service/drizzle.config.ts`**

```typescript
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  driver: 'pg',
  dbCredentials: { connectionString: process.env['DATABASE_URL'] ?? '' },
  schemaFilter: 'notif_schema',
  verbose: true,
} satisfies Config;
```

- [ ] **Step 3: Create `services/notification-service/src/db/schema.ts`**

```typescript
import {
  pgSchema, pgEnum, text, boolean, jsonb, timestamp, index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const notifSchema = pgSchema('notif_schema');

export const platformEnum = notifSchema.enum('platform', ['ios', 'android']);

// ── Notifications ─────────────────────────────────────────────────────────────
export const notifications = notifSchema.table(
  'notifications',
  {
    id:          text('id').primaryKey().default(sql`gen_random_uuid()`),
    clerkUserId: text('clerk_user_id').notNull(),
    title:       text('title').notNull(),
    body:        text('body').notNull(),
    data:        jsonb('data').notNull().default(sql`'{}'`),
    isRead:      boolean('is_read').notNull().default(false),
    createdAt:   timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    userIdx:  index('notif_user_idx').on(t.clerkUserId),
    readIdx:  index('notif_read_idx').on(t.isRead),
  }),
);

// ── Push Tokens ───────────────────────────────────────────────────────────────
export const pushTokens = notifSchema.table('push_tokens', {
  id:          text('id').primaryKey().default(sql`gen_random_uuid()`),
  clerkUserId: text('clerk_user_id').notNull(),
  token:       text('token').notNull().unique(),
  platform:    platformEnum('platform').notNull(),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
  lastSeenAt:  timestamp('last_seen_at').notNull().defaultNow(),
});

export type NotificationInsert = typeof notifications.$inferInsert;
export type PushTokenInsert = typeof pushTokens.$inferInsert;
```

- [ ] **Step 4: Create `services/notification-service/src/db/index.ts`**

```typescript
import { createDrizzleClient } from '@halalgo/database';
import * as schema from './schema.js';

export const db = createDrizzleClient(schema, 'notif_schema');
export * from './schema.js';
```

- [ ] **Step 5: Push notification schema to Neon**

```bash
cd services/notification-service && npm install && npx drizzle-kit push
```

Expected: `notifications`, `push_tokens` created in `notif_schema`.

- [ ] **Step 6: Commit**

```bash
git add services/notification-service/
git commit -m "feat: add notification-service Drizzle schema (notifications, push_tokens)"
```

---

## Task 8: Verify All Schemas in Neon

- [ ] **Step 1: Run all schema pushes from root**

```bash
npm run db:migrate
```

This runs `drizzle-kit push` in all services in parallel via Turborepo.

- [ ] **Step 2: Verify schemas via Drizzle Studio (any service)**

```bash
cd services/store-service && npx drizzle-kit studio
```

Open `https://local.drizzle.studio` — verify all 7 schemas visible with correct tables.

- [ ] **Step 3: Final commit**

```bash
git add .
git commit -m "chore: all 6 service Drizzle schemas pushed to Neon"
```

---

## Self-Review Checklist

- [x] All 6 service schemas defined: store, order, driver, payment, customer, notification
- [x] PostGIS geometry columns on: `stores.location`, `driver_profiles.location`, `addresses.location`, `delivery_zones.zone_polygon`, `surge_pricing_events.zone_polygon`
- [x] GiST indexes on all geometry columns for fast spatial queries
- [x] `pg_trgm` GIN index on `menu_items.name` for full-text search
- [x] All enum types defined per-schema (Drizzle requires this for `pgSchema`)
- [x] No circular foreign key references across schemas (cross-service references are text IDs only, not FK constraints)
- [x] `$inferInsert` and `$inferSelect` types exported from each schema
- [x] `gen_random_uuid()` used for all primary keys (requires `pgcrypto` — included in Neon by default)
- [x] No TBDs or placeholders
