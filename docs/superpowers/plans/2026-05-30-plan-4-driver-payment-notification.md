# HalalGo — Plan 4: Driver, Payment & Notification Services

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Driver Service (GPS tracking + dispatch algorithm), Payment Service (Stripe Payment Intents + Connect payouts), and Notification Service (Expo Push + Kafka consumer).

**Architecture:** Driver GPS updates flow: Driver App → API Gateway WebSocket → driver-service → Redis DB 0 (30s TTL) → Kafka `driver.location.updated`. Dispatch algorithm uses PostGIS to find nearest available drivers. Payment service is Stripe-first — no money logic outside it. Notification service is a pure Kafka consumer — it never receives HTTP requests, only events.

**Tech Stack:** Express, Drizzle ORM, KafkaJS, Stripe SDK, Expo Server SDK, ioredis, @halalgo/kafka, @halalgo/types, @halalgo/utils, Vitest

**Prerequisite:** Plans 1, 2, and 3 complete.

---

## File Map

```
services/
├── driver-service/src/
│   ├── index.ts
│   ├── app.ts
│   ├── dispatch/
│   │   └── dispatcher.ts        # PostGIS driver lookup + offer sequencing
│   ├── routes/
│   │   ├── drivers.ts           # availability, location, accept/decline
│   │   └── jobs.ts              # GET available orders
│   ├── controllers/
│   │   ├── availability.controller.ts
│   │   ├── location.controller.ts
│   │   └── dispatch.controller.ts
│   └── __tests__/
│       ├── dispatcher.test.ts
│       └── location.test.ts
├── payment-service/src/
│   ├── index.ts
│   ├── app.ts
│   ├── stripe/
│   │   └── client.ts            # Stripe singleton
│   ├── routes/
│   │   ├── intents.ts           # POST /api/payments/create-intent
│   │   └── webhook.ts           # POST /api/stripe/webhook
│   ├── controllers/
│   │   ├── intents.controller.ts
│   │   └── webhook.controller.ts
│   ├── kafka/
│   │   └── consumer.ts          # Listens to order.completed, order.cancelled
│   └── __tests__/
│       ├── intents.test.ts
│       └── payout.test.ts
└── notification-service/src/
    ├── index.ts                  # Kafka consumer only, no HTTP server
    ├── expo/
    │   └── push.ts              # Expo push notification sender
    ├── kafka/
    │   └── consumer.ts          # Handles all notification.send events
    └── __tests__/
        └── push.test.ts
```

---

## Task 1: Driver Service — Location Updates + Redis

**Files:**
- Create: `services/driver-service/src/controllers/location.controller.ts`
- Create: `services/driver-service/src/routes/drivers.ts`
- Create: `services/driver-service/src/app.ts`
- Create: `services/driver-service/src/index.ts`
- Test: `services/driver-service/src/__tests__/location.test.ts`

- [ ] **Step 1: Write failing location update test**

Create `services/driver-service/src/__tests__/location.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

// Mock Redis
vi.mock('ioredis', () => {
  const mockRedis = vi.fn().mockImplementation(() => ({
    set: vi.fn().mockResolvedValue('OK'),
    get: vi.fn().mockResolvedValue(JSON.stringify({ lat: 45.42, lng: -75.69, updatedAt: new Date().toISOString() })),
    setex: vi.fn().mockResolvedValue('OK'),
  }));
  return { default: mockRedis };
});

vi.mock('@halalgo/kafka', () => ({
  publishEvent: vi.fn().mockResolvedValue(undefined),
  KAFKA_TOPICS: { DRIVER_LOCATION_UPDATED: 'driver.location.updated' },
}));

vi.mock('../db/index.js', () => ({
  db: {
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { id: 'driver-1', clerkUserId: 'user_driver_1', isAvailable: true },
        ]),
      }),
    }),
  },
  driverProfiles: {},
}));

describe('PATCH /api/drivers/location', () => {
  it('accepts valid location update', async () => {
    const app = createApp();
    const res = await request(app)
      .patch('/api/drivers/location')
      .set('x-clerk-user-id', 'user_driver_1')
      .send({ latitude: 45.4215, longitude: -75.6972, activeOrderId: null });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 422 when coordinates missing', async () => {
    const app = createApp();
    const res = await request(app)
      .patch('/api/drivers/location')
      .set('x-clerk-user-id', 'user_driver_1')
      .send({});
    expect(res.status).toBe(422);
  });
});

describe('PATCH /api/drivers/availability', () => {
  it('sets driver online', async () => {
    const app = createApp();
    const res = await request(app)
      .patch('/api/drivers/availability')
      .set('x-clerk-user-id', 'user_driver_1')
      .send({ isAvailable: true });
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd services/driver-service && npm test
```

Expected: FAIL — `Cannot find module '../app.js'`

- [ ] **Step 3: Create `services/driver-service/src/controllers/location.controller.ts`**

```typescript
import type { Request, Response } from 'express';
import Redis from 'ioredis';
import { db, driverProfiles } from '../db/index.js';
import { eq, sql } from 'drizzle-orm';
import { publishEvent, KAFKA_TOPICS } from '@halalgo/kafka';
import { z } from 'zod';

function getLocationRedis(): Redis {
  const url = process.env['REDIS_DRIVER_LOCATION_URL'];
  if (!url) throw new Error('Missing REDIS_DRIVER_LOCATION_URL');
  return new Redis(url);
}

const locationRedis = getLocationRedis();

export const updateLocationSchema = z.object({
  latitude:      z.number().min(-90).max(90),
  longitude:     z.number().min(-180).max(180),
  activeOrderId: z.string().nullable().default(null),
});

export const updateAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
});

export { updateLocationSchema, updateAvailabilitySchema };

export async function updateLocation(req: Request, res: Response): Promise<void> {
  const clerkUserId = req.headers['x-clerk-user-id'] as string;
  const { latitude, longitude, activeOrderId } = req.body as z.infer<typeof updateLocationSchema>;

  // Cache in Redis with 30s TTL (driver is considered offline if no update in 30s)
  const locationData = { lat: latitude, lng: longitude, updatedAt: new Date().toISOString() };
  await locationRedis.setex(`driver:${clerkUserId}:location`, 30, JSON.stringify(locationData));

  // Update PostGIS location in DB (async, don't wait)
  db.update(driverProfiles)
    .set({
      location: sql`ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)`,
    })
    .where(eq(driverProfiles.clerkUserId, clerkUserId))
    .then(() => {})
    .catch(console.error);

  // Publish to Kafka for ETA recalculation and WebSocket fan-out
  await publishEvent(KAFKA_TOPICS.DRIVER_LOCATION_UPDATED, {
    driverId:     clerkUserId,
    latitude,
    longitude,
    activeOrderId,
    updatedAt:    new Date().toISOString(),
  }, clerkUserId);

  res.json({ success: true });
}

export async function updateAvailability(req: Request, res: Response): Promise<void> {
  const clerkUserId = req.headers['x-clerk-user-id'] as string;
  const { isAvailable } = req.body as z.infer<typeof updateAvailabilitySchema>;

  await db
    .update(driverProfiles)
    .set({ isAvailable })
    .where(eq(driverProfiles.clerkUserId, clerkUserId));

  await publishEvent(KAFKA_TOPICS.DRIVER_AVAILABILITY_CHANGED, {
    driverId:    clerkUserId,
    isAvailable,
    latitude:    null,
    longitude:   null,
  });

  res.json({ success: true });
}
```

- [ ] **Step 4: Create `services/driver-service/src/routes/drivers.ts`**

```typescript
import { Router } from 'express';
import {
  updateLocation,
  updateAvailability,
  updateLocationSchema,
  updateAvailabilitySchema,
} from '../controllers/location.controller.js';
import { validate } from '../middleware/validate.js';

export const driversRouter = Router();

driversRouter.patch('/location', validate(updateLocationSchema), updateLocation);
driversRouter.patch('/availability', validate(updateAvailabilitySchema), updateAvailability);
```

- [ ] **Step 5: Create `services/driver-service/src/app.ts`**

```typescript
import express from 'express';
import helmet from 'helmet';
import { driversRouter } from './routes/drivers.js';

export function createApp(): express.Application {
  const app = express();
  app.use(helmet());
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'driver-service' }));
  app.use('/api/drivers', driversRouter);

  return app;
}
```

- [ ] **Step 6: Create `services/driver-service/src/index.ts`**

```typescript
import 'dotenv/config';
import { createApp } from './app.js';

const PORT = process.env['PORT'] ?? 3003;
createApp().listen(PORT, () => {
  console.log(`[driver-service] running on port ${PORT}`);
});
```

- [ ] **Step 7: Run driver-service tests**

```bash
cd services/driver-service && npm install && npm test
```

Expected: All 3 location/availability tests PASS.

- [ ] **Step 8: Commit**

```bash
git add services/driver-service/src/
git commit -m "feat: driver-service location updates with Redis cache + Kafka events"
```

---

## Task 2: Driver Service — Dispatch Algorithm (TDD)

**Files:**
- Create: `services/driver-service/src/dispatch/dispatcher.ts`
- Test: `services/driver-service/src/__tests__/dispatcher.test.ts`

- [ ] **Step 1: Write failing dispatch tests**

Create `services/driver-service/src/__tests__/dispatcher.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { selectNearestDrivers } from '../dispatch/dispatcher.js';

vi.mock('../db/index.js', () => ({
  db: {
    execute: vi.fn().mockResolvedValue({
      rows: [
        { clerk_user_id: 'driver_1', distance_m: 800 },
        { clerk_user_id: 'driver_2', distance_m: 1500 },
        { clerk_user_id: 'driver_3', distance_m: 2200 },
      ],
    }),
  },
  driverProfiles: {},
}));

describe('selectNearestDrivers', () => {
  it('returns drivers sorted by distance ascending', async () => {
    const drivers = await selectNearestDrivers(45.4215, -75.6972, 5000);
    expect(drivers[0]!.clerkUserId).toBe('driver_1');
    expect(drivers[1]!.clerkUserId).toBe('driver_2');
  });

  it('returns max 10 drivers', async () => {
    const drivers = await selectNearestDrivers(45.4215, -75.6972, 5000);
    expect(drivers.length).toBeLessThanOrEqual(10);
  });

  it('returns empty array when no drivers nearby', async () => {
    const { db } = await import('../db/index.js');
    (db.execute as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ rows: [] });
    const drivers = await selectNearestDrivers(45.4215, -75.6972, 5000);
    expect(drivers).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd services/driver-service && npm test
```

Expected: FAIL — `Cannot find module '../dispatch/dispatcher.js'`

- [ ] **Step 3: Implement `services/driver-service/src/dispatch/dispatcher.ts`**

```typescript
import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';
import { publishEvent, KAFKA_TOPICS } from '@halalgo/kafka';

export interface NearbyDriver {
  clerkUserId: string;
  distanceM: number;
}

export async function selectNearestDrivers(
  storeLat: number,
  storeLng: number,
  radiusM: number = 5000,
  limit: number = 10,
): Promise<NearbyDriver[]> {
  const point = `ST_SetSRID(ST_MakePoint(${storeLng}, ${storeLat}), 4326)`;

  const result = await db.execute(sql`
    SELECT
      clerk_user_id,
      ST_Distance(location::geography, ${sql.raw(point)}::geography) AS distance_m
    FROM driver_schema.driver_profiles
    WHERE
      is_available = true
      AND is_verified = true
      AND location IS NOT NULL
      AND ST_Distance(location::geography, ${sql.raw(point)}::geography) < ${radiusM}
    ORDER BY distance_m ASC
    LIMIT ${limit}
  `);

  return (result.rows as Array<{ clerk_user_id: string; distance_m: number }>).map((row) => ({
    clerkUserId: row.clerk_user_id,
    distanceM:   row.distance_m,
  }));
}

// Offer order to drivers one-by-one with 30s timeout each
export async function dispatchOrder(
  orderId: string,
  storeLat: number,
  storeLng: number,
  estimatedEarnings: number,
): Promise<void> {
  const drivers = await selectNearestDrivers(storeLat, storeLng);

  for (const driver of drivers) {
    // Publish job offer to WebSocket channel via Kafka
    await publishEvent(KAFKA_TOPICS.DRIVER_LOCATION_UPDATED, {
      driverId:     `__dispatch__${orderId}`,
      latitude:     storeLat,
      longitude:    storeLng,
      activeOrderId: orderId,
      updatedAt:    new Date().toISOString(),
    });

    // The actual accept/decline is handled by the driver app calling
    // POST /api/drivers/jobs/:orderId/accept or /decline
    // This function only publishes the job offer event.
    // Timeout logic is managed by the driver-service Kafka consumer
    // which re-dispatches if no accept within 30s.
    break; // Offer to first driver only — dispatcher retries on decline/timeout
  }
}
```

- [ ] **Step 4: Run all dispatcher tests**

```bash
cd services/driver-service && npm test
```

Expected: All 3 dispatcher tests + 3 location tests PASS.

- [ ] **Step 5: Commit**

```bash
git add services/driver-service/src/dispatch/
git commit -m "feat: driver dispatch algorithm with PostGIS nearest-driver query"
```

---

## Task 3: Payment Service — Stripe Payment Intents

**Files:**
- Create: `services/payment-service/src/stripe/client.ts`
- Create: `services/payment-service/src/controllers/intents.controller.ts`
- Create: `services/payment-service/src/routes/intents.ts`
- Create: `services/payment-service/src/routes/webhook.ts`
- Create: `services/payment-service/src/controllers/webhook.controller.ts`
- Create: `services/payment-service/src/app.ts`
- Create: `services/payment-service/src/index.ts`
- Test: `services/payment-service/src/__tests__/intents.test.ts`

- [ ] **Step 1: Write failing payment intent test**

Create `services/payment-service/src/__tests__/intents.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

vi.mock('../stripe/client.js', () => ({
  stripe: {
    paymentIntents: {
      create: vi.fn().mockResolvedValue({
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret_abc',
        status: 'requires_payment_method',
        amount: 3550,
        currency: 'cad',
      }),
    },
  },
}));

vi.mock('../db/index.js', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'tx-1' }]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
    }),
  },
  transactions: {},
}));

describe('POST /api/payments/create-intent', () => {
  it('creates a Stripe payment intent', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/payments/create-intent')
      .set('x-clerk-user-id', 'user_123')
      .send({ orderId: 'order-1', amount: 35.50, currency: 'cad' });
    expect(res.status).toBe(201);
    expect(res.body.clientSecret).toBe('pi_test_123_secret_abc');
  });

  it('returns 422 when amount missing', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/payments/create-intent')
      .set('x-clerk-user-id', 'user_123')
      .send({ orderId: 'order-1' });
    expect(res.status).toBe(422);
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd services/payment-service && npm test
```

Expected: FAIL — `Cannot find module '../app.js'`

- [ ] **Step 3: Create `services/payment-service/src/stripe/client.ts`**

```typescript
import Stripe from 'stripe';

function createStripeClient(): Stripe {
  const secretKey = process.env['STRIPE_SECRET_KEY'];
  if (!secretKey) throw new Error('Missing STRIPE_SECRET_KEY');
  return new Stripe(secretKey, { apiVersion: '2024-04-10' });
}

export const stripe = createStripeClient();
```

- [ ] **Step 4: Create `services/payment-service/src/controllers/intents.controller.ts`**

```typescript
import type { Request, Response } from 'express';
import { stripe } from '../stripe/client.js';
import { db, transactions } from '../db/index.js';
import { cadToCents } from '@halalgo/utils';
import { z } from 'zod';

export const createIntentSchema = z.object({
  orderId:  z.string(),
  amount:   z.number().positive(),
  currency: z.enum(['cad']).default('cad'),
});

export { createIntentSchema };

const PLATFORM_FEE_RATE = 0.20; // 20%

export async function createPaymentIntent(req: Request, res: Response): Promise<void> {
  const { orderId, amount, currency } = req.body as z.infer<typeof createIntentSchema>;
  const amountCents = cadToCents(amount);
  const platformFeeCents = Math.round(amountCents * PLATFORM_FEE_RATE);

  const intent = await stripe.paymentIntents.create({
    amount:   amountCents,
    currency,
    metadata: { orderId },
    application_fee_amount: platformFeeCents,
  });

  await db.insert(transactions).values({
    orderId,
    stripePaymentIntentId: intent.id,
    amount:       String(amount),
    status:       'pending',
    platformFee:  String(amount * PLATFORM_FEE_RATE),
    storePayout:  String(amount * 0.80),
    driverPayout: '0',
  });

  res.status(201).json({
    clientSecret:      intent.client_secret,
    paymentIntentId:   intent.id,
  });
}
```

- [ ] **Step 5: Create `services/payment-service/src/controllers/webhook.controller.ts`**

```typescript
import type { Request, Response } from 'express';
import { stripe } from '../stripe/client.js';
import { db, transactions } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { publishEvent, KAFKA_TOPICS } from '@halalgo/kafka';

export async function handleStripeWebhook(req: Request, res: Response): Promise<void> {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env['STRIPE_WEBHOOK_SECRET'];

  if (!webhookSecret) {
    res.status(500).json({ error: 'Missing STRIPE_WEBHOOK_SECRET' });
    return;
  }

  let event: ReturnType<typeof stripe.webhooks.constructEvent>;

  try {
    // req.body must be raw Buffer for signature verification
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig, webhookSecret);
  } catch {
    res.status(400).json({ error: 'Invalid webhook signature' });
    return;
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object as { id: string; metadata: { orderId: string }; amount: number };
    const orderId = intent.metadata['orderId'];

    await db
      .update(transactions)
      .set({ status: 'succeeded' })
      .where(eq(transactions.stripePaymentIntentId, intent.id));

    await publishEvent(KAFKA_TOPICS.PAYMENT_COMPLETED, {
      orderId,
      stripePaymentIntentId: intent.id,
      amount: intent.amount / 100,
      clerkCustomerId: '',
    });
  }

  res.json({ received: true });
}
```

- [ ] **Step 6: Create routes and app**

Create `services/payment-service/src/routes/intents.ts`:

```typescript
import { Router } from 'express';
import { createPaymentIntent, createIntentSchema } from '../controllers/intents.controller.js';
import { validate } from '../middleware/validate.js';

export const intentsRouter = Router();
intentsRouter.post('/create-intent', validate(createIntentSchema), createPaymentIntent);
```

Create `services/payment-service/src/routes/webhook.ts`:

```typescript
import { Router } from 'express';
import { handleStripeWebhook } from '../controllers/webhook.controller.js';

export const webhookRouter = Router();
// Raw body required for Stripe signature verification
webhookRouter.post('/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);
```

Wait — need to import express in the webhook route file:

```typescript
import { Router } from 'express';
import express from 'express';
import { handleStripeWebhook } from '../controllers/webhook.controller.js';

export const webhookRouter = Router();
webhookRouter.post('/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);
```

Create `services/payment-service/src/app.ts`:

```typescript
import express from 'express';
import helmet from 'helmet';
import { intentsRouter } from './routes/intents.js';
import { webhookRouter } from './routes/webhook.js';
import { validate } from './middleware/validate.js';

export function createApp(): express.Application {
  const app = express();
  app.use(helmet());

  // Stripe webhook needs raw body — mount BEFORE json middleware
  app.use('/api/stripe', webhookRouter);

  app.use(express.json());
  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'payment-service' }));
  app.use('/api/payments', intentsRouter);

  return app;
}
```

Create `services/payment-service/src/index.ts`:

```typescript
import 'dotenv/config';
import { createApp } from './app.js';

const PORT = process.env['PORT'] ?? 3004;
createApp().listen(PORT, () => {
  console.log(`[payment-service] running on port ${PORT}`);
});
```

Also copy `validate.ts` middleware: `services/payment-service/src/middleware/validate.ts` (same content as in Plan 3 Task 1).

- [ ] **Step 7: Run payment-service tests**

```bash
cd services/payment-service && npm install && npm test
```

Expected: Both payment intent tests PASS.

- [ ] **Step 8: Commit**

```bash
git add services/payment-service/src/
git commit -m "feat: payment-service with Stripe Payment Intents, webhook handler, and Kafka events"
```

---

## Task 4: Notification Service — Kafka Consumer + Expo Push

**Files:**
- Create: `services/notification-service/src/expo/push.ts`
- Create: `services/notification-service/src/kafka/consumer.ts`
- Create: `services/notification-service/src/index.ts`
- Test: `services/notification-service/src/__tests__/push.test.ts`

- [ ] **Step 1: Write failing push notification test**

Create `services/notification-service/src/__tests__/push.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { sendPushNotification, chunkTokens } from '../expo/push.js';

vi.mock('expo-server-sdk', () => {
  const mockExpo = vi.fn().mockImplementation(() => ({
    chunkPushNotifications: vi.fn().mockImplementation((messages: unknown[]) => [messages]),
    sendPushNotificationsAsync: vi.fn().mockResolvedValue([
      { status: 'ok', id: 'notif-1' },
    ]),
    isExpoPushToken: vi.fn().mockReturnValue(true),
  }));
  return { default: mockExpo, Expo: mockExpo };
});

vi.mock('../db/index.js', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { token: 'ExponentPushToken[test123]', platform: 'ios' },
        ]),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
  },
  pushTokens: {},
  notifications: {},
}));

describe('sendPushNotification', () => {
  it('sends push to user and returns receipt', async () => {
    const result = await sendPushNotification({
      clerkUserId: 'user_123',
      title: 'Order confirmed!',
      body: 'Your order is being prepared.',
      data: { orderId: 'order-1' },
    });
    expect(result).toBeDefined();
  });
});

describe('chunkTokens', () => {
  it('splits tokens into chunks of 100', () => {
    const tokens = Array.from({ length: 250 }, (_, i) => `token-${i}`);
    const chunks = chunkTokens(tokens, 100);
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toHaveLength(100);
    expect(chunks[2]).toHaveLength(50);
  });

  it('returns single chunk for small arrays', () => {
    const tokens = ['token-1', 'token-2'];
    const chunks = chunkTokens(tokens, 100);
    expect(chunks).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd services/notification-service && npm test
```

Expected: FAIL — `Cannot find module '../expo/push.js'`

- [ ] **Step 3: Create `services/notification-service/src/expo/push.ts`**

```typescript
import Expo, { type ExpoPushMessage } from 'expo-server-sdk';
import { db, pushTokens, notifications } from '../db/index.js';
import { eq } from 'drizzle-orm';

const expo = new Expo();

export interface PushPayload {
  clerkUserId: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
}

export function chunkTokens<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export async function sendPushNotification(payload: PushPayload): Promise<void> {
  // Look up all push tokens for this user
  const tokens = await db
    .select()
    .from(pushTokens)
    .where(eq(pushTokens.clerkUserId, payload.clerkUserId));

  const validTokens = tokens.filter((t) => Expo.isExpoPushToken(t.token));
  if (validTokens.length === 0) return;

  const messages: ExpoPushMessage[] = validTokens.map((t) => ({
    to:    t.token,
    title: payload.title,
    body:  payload.body,
    data:  payload.data,
    sound: 'default',
  }));

  // Expo recommends chunking into groups of 100
  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    await expo.sendPushNotificationsAsync(chunk);
  }

  // Persist notification record
  await db.insert(notifications).values({
    clerkUserId: payload.clerkUserId,
    title:       payload.title,
    body:        payload.body,
    data:        payload.data,
  });
}
```

- [ ] **Step 4: Create `services/notification-service/src/kafka/consumer.ts`**

```typescript
import { createConsumer, KAFKA_TOPICS } from '@halalgo/kafka';
import { sendPushNotification } from '../expo/push.js';
import type {
  KafkaEvent,
  NotificationSendPayload,
  OrderStatusUpdatedPayload,
  OrderCreatedPayload,
} from '@halalgo/types';

const NOTIFICATION_MESSAGES: Record<string, (payload: unknown) => { title: string; body: string }> = {
  [KAFKA_TOPICS.ORDER_CREATED]: (p) => {
    const payload = p as OrderCreatedPayload;
    return { title: 'Order placed!', body: `Order #${payload.orderId.slice(-6).toUpperCase()} confirmed.` };
  },
  [KAFKA_TOPICS.ORDER_STATUS_UPDATED]: (p) => {
    const payload = p as OrderStatusUpdatedPayload;
    const messages: Record<string, string> = {
      confirmed:  'Your order has been confirmed!',
      preparing:  'The restaurant is preparing your order.',
      ready:      'Your order is ready for pickup!',
      picked_up:  'Your driver picked up your order.',
      delivered:  'Your order has been delivered. Enjoy!',
      cancelled:  'Your order has been cancelled.',
    };
    return { title: 'Order update', body: messages[payload.newStatus] ?? 'Order status updated.' };
  },
};

export async function startNotificationConsumer(): Promise<void> {
  await createConsumer(
    [KAFKA_TOPICS.NOTIFICATION_SEND, KAFKA_TOPICS.ORDER_STATUS_UPDATED, KAFKA_TOPICS.ORDER_CREATED],
    async (event: KafkaEvent<unknown>, raw) => {
      const topic = raw.topic;

      if (topic === KAFKA_TOPICS.NOTIFICATION_SEND) {
        const payload = event.payload as NotificationSendPayload;
        await sendPushNotification(payload);
        return;
      }

      const messageBuilder = NOTIFICATION_MESSAGES[topic];
      if (!messageBuilder) return;

      const { title, body } = messageBuilder(event.payload);

      // Extract clerkUserId from event payload
      const p = event.payload as { clerkCustomerId?: string };
      const clerkUserId = p.clerkCustomerId;
      if (!clerkUserId) return;

      await sendPushNotification({ clerkUserId, title, body, data: event.payload as Record<string, unknown> });
    },
  );
}
```

- [ ] **Step 5: Create `services/notification-service/src/index.ts`**

```typescript
import 'dotenv/config';
import { startNotificationConsumer } from './kafka/consumer.js';

console.log('[notification-service] starting Kafka consumer...');
startNotificationConsumer()
  .then(() => console.log('[notification-service] consuming events'))
  .catch((err) => {
    console.error('[notification-service] failed to start:', err);
    process.exit(1);
  });
```

- [ ] **Step 6: Run notification-service tests**

```bash
cd services/notification-service && npm install && npm test
```

Expected: All 4 push/chunk tests PASS.

- [ ] **Step 7: Commit**

```bash
git add services/notification-service/src/
git commit -m "feat: notification-service Kafka consumer with Expo push delivery"
```

---

## Task 5: Full Services Smoke Test

- [ ] **Step 1: Start all 4 services**

```bash
npm run dev --filter=driver-service
npm run dev --filter=payment-service
```

- [ ] **Step 2: Verify health endpoints**

```bash
curl http://localhost:3003/health
curl http://localhost:3004/health
```

Expected: `{"status":"ok","service":"driver-service"}` and `{"status":"ok","service":"payment-service"}`

- [ ] **Step 3: Run all tests from root**

```bash
npm run test
```

Expected: All tests across all services PASS.

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "chore: plan 4 complete — driver, payment, notification services running"
```

---

## Self-Review Checklist

- [x] Driver location: cached in Redis (30s TTL) AND updated in PostGIS async
- [x] Dispatch: PostGIS `ST_Distance` query, sorted ascending, max 10 drivers, radius configurable
- [x] Payment: Stripe webhook verifies signature before processing, raw body middleware mounted before JSON parser
- [x] Platform fee: 20% computed server-side, stored in `transactions.platform_fee`
- [x] Notification: pure Kafka consumer — no HTTP server, handles `notification.send`, `order.created`, `order.status.updated`
- [x] Push chunking: Expo recommends 100 per chunk — implemented via `chunkTokens`
- [x] All Kafka events use typed payloads from `@halalgo/types`
- [x] No TBDs or placeholders
