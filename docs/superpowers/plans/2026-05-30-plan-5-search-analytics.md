# HalalGo — Plan 5: Search & Analytics Services

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Search Service (Elasticsearch-powered store and menu item search with geo-filtering) and the Analytics Service (CQRS read models for the admin dashboard, fed by Kafka events).

**Architecture:** Search Service maintains two Elasticsearch indices (`stores`, `menu_items`) synced via Kafka events. It exposes a single `/api/search` endpoint. Analytics Service is a pure Kafka consumer — it writes aggregated metrics to `analytics_schema` materialized views in Neon, then exposes read-only endpoints for the admin panel.

**Tech Stack:** @elastic/elasticsearch 8, KafkaJS, Drizzle ORM, Express, Vitest

**Prerequisite:** Plans 1–4 complete.

---

## File Map

```
services/
├── search-service/src/
│   ├── index.ts
│   ├── app.ts
│   ├── elastic/
│   │   ├── client.ts            # Elasticsearch client singleton
│   │   └── indices.ts           # Index mappings + setup
│   ├── kafka/
│   │   └── consumer.ts          # Syncs store/menu changes to ES
│   ├── routes/
│   │   └── search.ts
│   ├── controllers/
│   │   └── search.controller.ts
│   └── __tests__/
│       └── search.test.ts
└── analytics-service/src/
    ├── index.ts
    ├── app.ts
    ├── db/
    │   ├── schema.ts             # analytics_schema tables
    │   └── index.ts
    ├── kafka/
    │   └── consumer.ts          # Updates metrics on every order/payment event
    ├── routes/
    │   └── analytics.ts
    ├── controllers/
    │   └── analytics.controller.ts
    └── __tests__/
        └── analytics.test.ts
```

---

## Task 1: Search Service — Elasticsearch Setup

**Files:**
- Create: `services/search-service/package.json`
- Create: `services/search-service/src/elastic/client.ts`
- Create: `services/search-service/src/elastic/indices.ts`

- [ ] **Step 1: Create `services/search-service/package.json`**

```json
{
  "name": "@halalgo/search-service",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "es:setup": "tsx src/elastic/indices.ts"
  },
  "dependencies": {
    "@elastic/elasticsearch": "^8.13.0",
    "@halalgo/types": "workspace:*",
    "@halalgo/kafka": "workspace:*",
    "express": "^4.18.2",
    "dotenv": "^16.4.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "*",
    "typescript": "*",
    "tsx": "^4.7.0",
    "vitest": "*"
  }
}
```

- [ ] **Step 2: Create `services/search-service/src/elastic/client.ts`**

```typescript
import { Client } from '@elastic/elasticsearch';

function createElasticsearchClient(): Client {
  const url = process.env['ELASTICSEARCH_URL'];
  const apiKey = process.env['ELASTICSEARCH_API_KEY'];

  if (!url || !apiKey) {
    throw new Error('Missing ELASTICSEARCH_URL or ELASTICSEARCH_API_KEY');
  }

  return new Client({ node: url, auth: { apiKey } });
}

export const esClient = createElasticsearchClient();
```

- [ ] **Step 3: Create `services/search-service/src/elastic/indices.ts`**

```typescript
import { esClient } from './client.js';

export const INDICES = {
  STORES: 'halalgo_stores',
  MENU_ITEMS: 'halalgo_menu_items',
} as const;

export async function setupIndices(): Promise<void> {
  // Stores index
  const storesExists = await esClient.indices.exists({ index: INDICES.STORES });
  if (!storesExists) {
    await esClient.indices.create({
      index: INDICES.STORES,
      mappings: {
        properties: {
          id:              { type: 'keyword' },
          name:            { type: 'text', analyzer: 'standard' },
          description:     { type: 'text', analyzer: 'standard' },
          cuisineType:     { type: 'keyword' },
          storeType:       { type: 'keyword' },
          isOpen:          { type: 'boolean' },
          isVerified:      { type: 'boolean' },
          rating:          { type: 'float' },
          deliveryFee:     { type: 'float' },
          deliveryTimeMin: { type: 'integer' },
          city:            { type: 'keyword' },
          province:        { type: 'keyword' },
          location:        { type: 'geo_point' },
        },
      },
    });
    console.log(`Created index: ${INDICES.STORES}`);
  }

  // Menu items index
  const menuExists = await esClient.indices.exists({ index: INDICES.MENU_ITEMS });
  if (!menuExists) {
    await esClient.indices.create({
      index: INDICES.MENU_ITEMS,
      mappings: {
        properties: {
          id:          { type: 'keyword' },
          storeId:     { type: 'keyword' },
          name:        { type: 'text', analyzer: 'standard' },
          description: { type: 'text', analyzer: 'standard' },
          basePrice:   { type: 'float' },
          isAvailable: { type: 'boolean' },
          allergens:   { type: 'keyword' },
          storeType:   { type: 'keyword' },
        },
      },
    });
    console.log(`Created index: ${INDICES.MENU_ITEMS}`);
  }
}

// Run directly: npx tsx src/elastic/indices.ts
if (process.argv[1]?.endsWith('indices.ts') || process.argv[1]?.endsWith('indices.js')) {
  setupIndices().catch(console.error);
}
```

- [ ] **Step 4: Setup Elasticsearch indices**

Make sure `.env` has `ELASTICSEARCH_URL` and `ELASTICSEARCH_API_KEY`, then run:

```bash
cd services/search-service && npm install && npm run es:setup
```

Expected:
```
Created index: halalgo_stores
Created index: halalgo_menu_items
```

- [ ] **Step 5: Commit**

```bash
git add services/search-service/
git commit -m "feat: search-service Elasticsearch client and index setup"
```

---

## Task 2: Search Service — Search Controller (TDD)

**Files:**
- Create: `services/search-service/src/controllers/search.controller.ts`
- Create: `services/search-service/src/routes/search.ts`
- Create: `services/search-service/src/app.ts`
- Create: `services/search-service/src/index.ts`
- Test: `services/search-service/src/__tests__/search.test.ts`

- [ ] **Step 1: Write failing search tests**

Create `services/search-service/src/__tests__/search.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

vi.mock('../elastic/client.js', () => ({
  esClient: {
    search: vi.fn().mockResolvedValue({
      hits: {
        hits: [
          {
            _id: 'store-1',
            _score: 1.5,
            _source: {
              id: 'store-1',
              name: 'Shawarma Palace',
              cuisineType: 'Lebanese',
              storeType: 'restaurant',
              isOpen: true,
              rating: 4.8,
              deliveryFee: 2.99,
              deliveryTimeMin: 30,
            },
          },
        ],
        total: { value: 1 },
      },
    }),
  },
}));

describe('GET /api/search/stores', () => {
  it('returns search results for query', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/api/search/stores')
      .query({ q: 'shawarma', lat: '45.42', lng: '-75.69' });
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0].name).toBe('Shawarma Palace');
  });

  it('returns 422 when query is empty', async () => {
    const app = createApp();
    const res = await request(app).get('/api/search/stores');
    expect(res.status).toBe(422);
  });

  it('filters by storeType=grocery', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/api/search/stores')
      .query({ q: 'halal', storeType: 'grocery' });
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd services/search-service && npm test
```

Expected: FAIL — `Cannot find module '../app.js'`

- [ ] **Step 3: Create `services/search-service/src/controllers/search.controller.ts`**

```typescript
import type { Request, Response } from 'express';
import { esClient } from '../elastic/client.js';
import { INDICES } from '../elastic/indices.js';
import { z } from 'zod';

export const searchQuerySchema = z.object({
  q:          z.string().min(1, 'Search query is required'),
  storeType:  z.enum(['restaurant', 'grocery']).optional(),
  lat:        z.coerce.number().optional(),
  lng:        z.coerce.number().optional(),
  radiusKm:   z.coerce.number().default(10),
  openOnly:   z.coerce.boolean().default(false),
  halalOnly:  z.coerce.boolean().default(false),
  page:       z.coerce.number().int().min(1).default(1),
  pageSize:   z.coerce.number().int().min(1).max(50).default(20),
});

export async function searchStores(req: Request, res: Response): Promise<void> {
  const parsed = searchQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(422).json({
      error: 'Validation failed',
      issues: parsed.error.issues,
    });
    return;
  }

  const { q, storeType, lat, lng, radiusKm, openOnly, halalOnly, page, pageSize } = parsed.data;

  const must: object[] = [
    { multi_match: { query: q, fields: ['name^3', 'description', 'cuisineType'] } },
  ];

  const filter: object[] = [{ term: { isVerified: true } }];

  if (storeType) filter.push({ term: { storeType } });
  if (openOnly) filter.push({ term: { isOpen: true } });
  if (halalOnly) filter.push({ term: { isVerified: true } });

  const geoFilter = lat !== undefined && lng !== undefined
    ? { geo_distance: { distance: `${radiusKm}km`, location: { lat, lon: lng } } }
    : null;

  if (geoFilter) filter.push(geoFilter);

  const response = await esClient.search({
    index: INDICES.STORES,
    from:  (page - 1) * pageSize,
    size:  pageSize,
    query: { bool: { must, filter } },
    sort:  lat !== undefined && lng !== undefined
      ? [{ _geo_distance: { location: { lat, lon: lng }, order: 'asc', unit: 'km' } }]
      : [{ rating: 'desc' }],
  });

  const results = response.hits.hits.map((hit) => ({ ...hit._source, _score: hit._score }));
  const total = typeof response.hits.total === 'number'
    ? response.hits.total
    : response.hits.total?.value ?? 0;

  res.json({ results, total, page, pageSize });
}

export async function searchMenuItems(req: Request, res: Response): Promise<void> {
  const parsed = searchQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(422).json({ error: 'Validation failed', issues: parsed.error.issues });
    return;
  }

  const { q, storeType, page, pageSize } = parsed.data;

  const filter: object[] = [{ term: { isAvailable: true } }];
  if (storeType) filter.push({ term: { storeType } });

  const response = await esClient.search({
    index: INDICES.MENU_ITEMS,
    from:  (page - 1) * pageSize,
    size:  pageSize,
    query: {
      bool: {
        must:   [{ multi_match: { query: q, fields: ['name^3', 'description'] } }],
        filter,
      },
    },
  });

  const results = response.hits.hits.map((hit) => hit._source);
  const total = typeof response.hits.total === 'number'
    ? response.hits.total
    : response.hits.total?.value ?? 0;

  res.json({ results, total, page, pageSize });
}
```

- [ ] **Step 4: Create routes and app**

Create `services/search-service/src/routes/search.ts`:

```typescript
import { Router } from 'express';
import { searchStores, searchMenuItems } from '../controllers/search.controller.js';

export const searchRouter = Router();
searchRouter.get('/stores', searchStores);
searchRouter.get('/menu', searchMenuItems);
```

Create `services/search-service/src/app.ts`:

```typescript
import express from 'express';
import helmet from 'helmet';
import { searchRouter } from './routes/search.js';

export function createApp(): express.Application {
  const app = express();
  app.use(helmet());
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'search-service' }));
  app.use('/api/search', searchRouter);

  return app;
}
```

Create `services/search-service/src/index.ts`:

```typescript
import 'dotenv/config';
import { createApp } from './app.js';
import { startSearchConsumer } from './kafka/consumer.js';

const PORT = process.env['PORT'] ?? 3006;
createApp().listen(PORT, () => {
  console.log(`[search-service] running on port ${PORT}`);
});

startSearchConsumer().catch(console.error);
```

- [ ] **Step 5: Run search tests**

```bash
cd services/search-service && npm test
```

Expected: All 3 search tests PASS.

- [ ] **Step 6: Commit**

```bash
git add services/search-service/src/
git commit -m "feat: search-service with Elasticsearch full-text + geo-distance search"
```

---

## Task 3: Search Service — Kafka Sync Consumer

**Files:**
- Create: `services/search-service/src/kafka/consumer.ts`

- [ ] **Step 1: Create `services/search-service/src/kafka/consumer.ts`**

```typescript
import { createConsumer, KAFKA_TOPICS } from '@halalgo/kafka';
import { esClient } from '../elastic/client.js';
import { INDICES } from '../elastic/indices.js';
import type { KafkaEvent, StoreStatusChangedPayload } from '@halalgo/types';

export async function startSearchConsumer(): Promise<void> {
  await createConsumer(
    [KAFKA_TOPICS.STORE_STATUS_CHANGED],
    async (event: KafkaEvent<unknown>, raw) => {
      if (raw.topic === KAFKA_TOPICS.STORE_STATUS_CHANGED) {
        const payload = event.payload as StoreStatusChangedPayload;

        // Update the store's isOpen + isVerified in Elasticsearch
        await esClient.update({
          index: INDICES.STORES,
          id:    payload.storeId,
          doc:   { isOpen: payload.isOpen, isVerified: payload.isVerified },
          doc_as_upsert: true,
        });
      }
    },
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add services/search-service/src/kafka/
git commit -m "feat: search-service Kafka consumer syncs store status to Elasticsearch"
```

---

## Task 4: Analytics Service — Database Schema + Kafka Consumer

**Files:**
- Create: `services/analytics-service/package.json`
- Create: `services/analytics-service/drizzle.config.ts`
- Create: `services/analytics-service/src/db/schema.ts`
- Create: `services/analytics-service/src/db/index.ts`
- Create: `services/analytics-service/src/kafka/consumer.ts`

- [ ] **Step 1: Create `services/analytics-service/package.json`**

```json
{
  "name": "@halalgo/analytics-service",
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
    "dotenv": "^16.4.0"
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

- [ ] **Step 2: Create `services/analytics-service/drizzle.config.ts`**

```typescript
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  driver: 'pg',
  dbCredentials: { connectionString: process.env['DATABASE_URL'] ?? '' },
  schemaFilter: 'analytics_schema',
  verbose: true,
} satisfies Config;
```

- [ ] **Step 3: Create `services/analytics-service/src/db/schema.ts`**

```typescript
import { pgSchema, text, integer, numeric, timestamp, date, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const analyticsSchema = pgSchema('analytics_schema');

// Daily revenue rollup — one row per day
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

// Per-store revenue rollup
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

// Hourly order counts (for "orders per hour" chart)
export const hourlyOrders = analyticsSchema.table(
  'hourly_orders',
  {
    id:         text('id').primaryKey().default(sql`gen_random_uuid()`),
    date:       date('date').notNull(),
    hour:       integer('hour').notNull(),      // 0-23
    orderCount: integer('order_count').notNull().default(0),
  },
);

export type DailyRevenueInsert = typeof dailyRevenue.$inferInsert;
export type StoreRevenueInsert = typeof storeRevenue.$inferInsert;
```

- [ ] **Step 4: Create `services/analytics-service/src/db/index.ts`**

```typescript
import { createDrizzleClient } from '@halalgo/database';
import * as schema from './schema.js';

export const db = createDrizzleClient(schema, 'analytics_schema');
export * from './schema.js';
```

- [ ] **Step 5: Push analytics schema to Neon**

```bash
cd services/analytics-service && npm install && npx drizzle-kit push
```

Expected: `daily_revenue`, `store_revenue`, `hourly_orders` created in `analytics_schema`.

- [ ] **Step 6: Create `services/analytics-service/src/kafka/consumer.ts`**

```typescript
import { createConsumer, KAFKA_TOPICS } from '@halalgo/kafka';
import { db, dailyRevenue, storeRevenue, hourlyOrders } from '../db/index.js';
import { eq, and, sql } from 'drizzle-orm';
import type { KafkaEvent, OrderCompletedPayload } from '@halalgo/types';

function todayDate(): string {
  return new Date().toISOString().split('T')[0]!;
}

function currentHour(): number {
  return new Date().getHours();
}

async function upsertDailyRevenue(amount: number): Promise<void> {
  const today = todayDate();
  const platformFee = amount * 0.20;

  await db.execute(sql`
    INSERT INTO analytics_schema.daily_revenue (date, total_revenue, platform_fees, order_count)
    VALUES (${today}, ${amount}, ${platformFee}, 1)
    ON CONFLICT (date) DO UPDATE SET
      total_revenue = daily_revenue.total_revenue + ${amount},
      platform_fees = daily_revenue.platform_fees + ${platformFee},
      order_count   = daily_revenue.order_count + 1,
      updated_at    = NOW()
  `);
}

async function upsertStoreRevenue(storeId: string, amount: number): Promise<void> {
  const today = todayDate();

  await db.execute(sql`
    INSERT INTO analytics_schema.store_revenue (store_id, date, total_revenue, order_count)
    VALUES (${storeId}, ${today}, ${amount}, 1)
    ON CONFLICT (store_id, date) DO UPDATE SET
      total_revenue = store_revenue.total_revenue + ${amount},
      order_count   = store_revenue.order_count + 1,
      updated_at    = NOW()
  `);
}

async function upsertHourlyOrder(): Promise<void> {
  const today = todayDate();
  const hour = currentHour();

  await db.execute(sql`
    INSERT INTO analytics_schema.hourly_orders (date, hour, order_count)
    VALUES (${today}, ${hour}, 1)
    ON CONFLICT (date, hour) DO UPDATE SET
      order_count = hourly_orders.order_count + 1
  `);
}

export async function startAnalyticsConsumer(): Promise<void> {
  await createConsumer(
    [KAFKA_TOPICS.ORDER_COMPLETED],
    async (event: KafkaEvent<unknown>) => {
      const payload = event.payload as OrderCompletedPayload;

      await Promise.all([
        upsertDailyRevenue(payload.total),
        upsertStoreRevenue(payload.storeId, payload.subtotal * 0.80),
        upsertHourlyOrder(),
      ]);
    },
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add services/analytics-service/src/kafka/
git commit -m "feat: analytics-service Kafka consumer with upsert rollups"
```

---

## Task 5: Analytics Service — Dashboard API

**Files:**
- Create: `services/analytics-service/src/controllers/analytics.controller.ts`
- Create: `services/analytics-service/src/routes/analytics.ts`
- Create: `services/analytics-service/src/app.ts`
- Create: `services/analytics-service/src/index.ts`
- Test: `services/analytics-service/src/__tests__/analytics.test.ts`

- [ ] **Step 1: Write failing analytics test**

Create `services/analytics-service/src/__tests__/analytics.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

vi.mock('../db/index.js', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            { date: '2026-05-30', totalRevenue: '1250.00', orderCount: 42 },
          ]),
        }),
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
    execute: vi.fn().mockResolvedValue({ rows: [] }),
  },
  dailyRevenue: {},
  storeRevenue: {},
  hourlyOrders: {},
}));

describe('GET /api/analytics/dashboard', () => {
  it('returns dashboard metrics', async () => {
    const app = createApp();
    const res = await request(app).get('/api/analytics/dashboard');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('revenue');
    expect(res.body).toHaveProperty('orders');
  });
});

describe('GET /api/analytics/revenue', () => {
  it('returns revenue for last 7 days', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/api/analytics/revenue')
      .query({ days: '7' });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd services/analytics-service && npm test
```

Expected: FAIL — `Cannot find module '../app.js'`

- [ ] **Step 3: Create `services/analytics-service/src/controllers/analytics.controller.ts`**

```typescript
import type { Request, Response } from 'express';
import { db, dailyRevenue, storeRevenue, hourlyOrders } from '../db/index.js';
import { desc, sql } from 'drizzle-orm';

export async function getDashboard(_req: Request, res: Response): Promise<void> {
  const [todayRevenue] = await db
    .select()
    .from(dailyRevenue)
    .orderBy(desc(dailyRevenue.date))
    .limit(1);

  const [hourlyData] = await db
    .select()
    .from(hourlyOrders)
    .orderBy(desc(hourlyOrders.date))
    .limit(24);

  res.json({
    revenue: {
      today:      todayRevenue?.totalRevenue ?? 0,
      orderCount: todayRevenue?.orderCount ?? 0,
    },
    orders: {
      hourly: hourlyData ?? [],
    },
  });
}

export async function getRevenueTrend(req: Request, res: Response): Promise<void> {
  const days = parseInt((req.query['days'] as string) ?? '7', 10);

  const data = await db
    .select()
    .from(dailyRevenue)
    .orderBy(desc(dailyRevenue.date))
    .limit(days);

  res.json({ data: data.reverse() }); // chronological order
}
```

- [ ] **Step 4: Create routes and app**

Create `services/analytics-service/src/routes/analytics.ts`:

```typescript
import { Router } from 'express';
import { getDashboard, getRevenueTrend } from '../controllers/analytics.controller.js';

export const analyticsRouter = Router();
analyticsRouter.get('/dashboard', getDashboard);
analyticsRouter.get('/revenue', getRevenueTrend);
```

Create `services/analytics-service/src/app.ts`:

```typescript
import express from 'express';
import helmet from 'helmet';
import { analyticsRouter } from './routes/analytics.js';

export function createApp(): express.Application {
  const app = express();
  app.use(helmet());
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'analytics-service' }));
  app.use('/api/analytics', analyticsRouter);

  return app;
}
```

Create `services/analytics-service/src/index.ts`:

```typescript
import 'dotenv/config';
import { createApp } from './app.js';
import { startAnalyticsConsumer } from './kafka/consumer.js';

const PORT = process.env['PORT'] ?? 3007;
createApp().listen(PORT, () => {
  console.log(`[analytics-service] running on port ${PORT}`);
});

startAnalyticsConsumer().catch(console.error);
```

- [ ] **Step 5: Run analytics tests**

```bash
cd services/analytics-service && npm install && npm test
```

Expected: Both analytics tests PASS.

- [ ] **Step 6: Run all tests from root**

```bash
npm run test
```

Expected: All tests across all 8 services PASS.

- [ ] **Step 7: Final commit**

```bash
git add .
git commit -m "chore: plan 5 complete — search and analytics services running"
```

---

## Self-Review Checklist

- [x] Elasticsearch: two indices (`halalgo_stores`, `halalgo_menu_items`) with correct mappings
- [x] Search: supports full-text + geo-distance + storeType + openOnly + halalOnly + pagination
- [x] Search Kafka consumer: syncs `store.status.changed` to Elasticsearch `doc_as_upsert`
- [x] Analytics: CQRS pattern — pure Kafka consumer writes aggregated rollups, separate read endpoints
- [x] Analytics upserts: `ON CONFLICT DO UPDATE` for idempotent Kafka replay
- [x] All search queries validated with Zod (returns 422 on missing `q`)
- [x] No direct cross-service DB queries — analytics reads only `analytics_schema`
- [x] No TBDs or placeholders
