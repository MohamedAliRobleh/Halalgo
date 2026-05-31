# HalalGo — Plan 3: Core Services (Store, Order FSM, Customer)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Store Service (CRUD + menu management), Order Service (state machine + dispatch trigger), and Customer Service (profiles + addresses) as fully working Express microservices with Kafka event publishing.

**Architecture:** Each service is a standalone Express app. Business logic in `controllers/`. Kafka events published on every significant state change. Zod validates all request bodies at the route level. Services communicate only via Kafka events and HTTP (no direct DB cross-access).

**Tech Stack:** Express 4, Drizzle ORM, KafkaJS, Zod, Vitest + Supertest, @halalgo/utils (tax, price), @halalgo/kafka, @halalgo/types

**Prerequisite:** Plans 1 and 2 complete — shared packages built, all Drizzle schemas pushed to Neon.

---

## File Map

```
services/
├── store-service/src/
│   ├── index.ts
│   ├── app.ts
│   ├── middleware/validate.ts
│   ├── routes/
│   │   ├── stores.ts            # GET /api/stores, GET /api/stores/nearby, GET /api/stores/:id
│   │   ├── menu.ts              # GET+POST+PUT+DELETE /api/menu/...
│   │   └── hours.ts             # PUT /api/stores/:id/hours
│   ├── controllers/
│   │   ├── stores.controller.ts
│   │   └── menu.controller.ts
│   └── __tests__/
│       ├── stores.test.ts
│       └── menu.test.ts
├── order-service/src/
│   ├── index.ts
│   ├── app.ts
│   ├── fsm/
│   │   └── orderFSM.ts          # State machine — validates transitions
│   ├── routes/
│   │   └── orders.ts
│   ├── controllers/
│   │   └── orders.controller.ts
│   └── __tests__/
│       ├── orderFSM.test.ts
│       └── orders.test.ts
└── customer-service/src/
    ├── index.ts
    ├── app.ts
    ├── routes/
    │   ├── profiles.ts
    │   └── addresses.ts
    ├── controllers/
    │   ├── profiles.controller.ts
    │   └── addresses.controller.ts
    └── __tests__/
        └── addresses.test.ts
```

---

## Task 1: Shared Validation Middleware

Each service uses the same Zod validation middleware pattern.

**Files:**
- Create: `services/store-service/src/middleware/validate.ts`
- (Repeat this file identically in order-service and customer-service)

- [ ] **Step 1: Create `services/store-service/src/middleware/validate.ts`**

```typescript
import type { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validate<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(422).json({
        error: 'Validation failed',
        issues: result.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      });
      return;
    }
    req.body = result.data;
    next();
  };
}
```

Copy this file to:
- `services/order-service/src/middleware/validate.ts`
- `services/customer-service/src/middleware/validate.ts`

- [ ] **Step 2: Commit**

```bash
git add services/*/src/middleware/validate.ts
git commit -m "feat: add shared Zod validation middleware to all services"
```

---

## Task 2: Store Service — Stores CRUD

**Files:**
- Create: `services/store-service/src/controllers/stores.controller.ts`
- Create: `services/store-service/src/routes/stores.ts`
- Test: `services/store-service/src/__tests__/stores.test.ts`

- [ ] **Step 1: Write failing test for nearby stores endpoint**

Create `services/store-service/src/__tests__/stores.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

// Mock db to avoid real Neon connection in unit tests
vi.mock('../db/index.js', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          {
            id: 'store-1',
            name: 'Shawarma Palace',
            storeType: 'restaurant',
            isOpen: true,
            rating: 4.8,
            deliveryFee: '2.99',
            deliveryTimeMin: 30,
            isVerified: true,
          },
        ]),
      }),
    }),
  },
}));

describe('GET /api/stores/nearby', () => {
  it('returns 400 when lat/lng missing', async () => {
    const app = createApp();
    const res = await request(app).get('/api/stores/nearby');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/lat.*lng/i);
  });

  it('returns stores array when lat/lng provided', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/api/stores/nearby')
      .query({ lat: '45.4215', lng: '-75.6972', radiusKm: '5' });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.stores)).toBe(true);
  });
});

describe('GET /api/stores/:id', () => {
  it('returns 404 for unknown store', async () => {
    const { db } = await import('../db/index.js');
    (db.select as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });
    const app = createApp();
    const res = await request(app).get('/api/stores/nonexistent');
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd services/store-service && npm test
```

Expected: FAIL — `Cannot find module '../app.js'`

- [ ] **Step 3: Create `services/store-service/src/controllers/stores.controller.ts`**

```typescript
import type { Request, Response } from 'express';
import { db, stores } from '../db/index.js';
import { eq, sql } from 'drizzle-orm';
import { publishEvent } from '@halalgo/kafka';
import { KAFKA_TOPICS } from '@halalgo/kafka';
import { z } from 'zod';

const createStoreSchema = z.object({
  name:            z.string().min(2),
  description:     z.string().default(''),
  address:         z.string(),
  city:            z.string(),
  province:        z.string().length(2),
  postalCode:      z.string(),
  storeType:       z.enum(['restaurant', 'grocery']),
  cuisineType:     z.string().optional(),
  latitude:        z.number().min(-90).max(90),
  longitude:       z.number().min(-180).max(180),
  deliveryFee:     z.number().min(0).default(0),
  minOrder:        z.number().min(0).default(0),
  deliveryTimeMin: z.number().int().min(5).default(30),
});

export type CreateStoreBody = z.infer<typeof createStoreSchema>;
export { createStoreSchema };

export async function getNearbyStores(req: Request, res: Response): Promise<void> {
  const lat = parseFloat(req.query['lat'] as string);
  const lng = parseFloat(req.query['lng'] as string);
  const radiusKm = parseFloat((req.query['radiusKm'] as string) ?? '10');
  const storeType = req.query['storeType'] as string | undefined;

  if (isNaN(lat) || isNaN(lng)) {
    res.status(400).json({ error: 'lat and lng query params are required' });
    return;
  }

  // ST_Distance in meters; filter by radiusKm * 1000
  const radiusM = radiusKm * 1000;
  const point = `ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)`;

  const rows = await db
    .select()
    .from(stores)
    .where(
      sql`ST_Distance(${stores.location}::geography, ${sql.raw(point)}::geography) < ${radiusM}
        AND ${stores.isVerified} = true
        ${storeType ? sql`AND ${stores.storeType} = ${storeType}` : sql``}`,
    );

  res.json({ stores: rows });
}

export async function getStoreById(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const rows = await db.select().from(stores).where(eq(stores.id, id));

  if (rows.length === 0) {
    res.status(404).json({ error: 'Store not found' });
    return;
  }

  res.json({ store: rows[0] });
}

export async function updateStoreStatus(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const { isOpen } = req.body as { isOpen: boolean };

  await db
    .update(stores)
    .set({ isOpen, updatedAt: new Date() })
    .where(eq(stores.id, id));

  await publishEvent(KAFKA_TOPICS.STORE_STATUS_CHANGED, {
    storeId: id,
    isOpen,
    isVerified: true,
  });

  res.json({ success: true });
}
```

- [ ] **Step 4: Create `services/store-service/src/routes/stores.ts`**

```typescript
import { Router } from 'express';
import {
  getNearbyStores,
  getStoreById,
  updateStoreStatus,
  createStoreSchema,
} from '../controllers/stores.controller.js';
import { validate } from '../middleware/validate.js';

export const storesRouter = Router();

storesRouter.get('/nearby', getNearbyStores);
storesRouter.get('/:id', getStoreById);
storesRouter.patch(
  '/:id/status',
  validate(createStoreSchema.pick({ name: true }).extend({ isOpen: createStoreSchema.shape.name.transform(Boolean).optional() }).omit({ name: true }).extend({ isOpen: require('zod').z.boolean() })),
  updateStoreStatus,
);
```

Wait — the status route just needs `isOpen: boolean`. Simplify:

```typescript
import { Router } from 'express';
import { z } from 'zod';
import {
  getNearbyStores,
  getStoreById,
  updateStoreStatus,
} from '../controllers/stores.controller.js';
import { validate } from '../middleware/validate.js';

export const storesRouter = Router();

storesRouter.get('/nearby', getNearbyStores);
storesRouter.get('/:id', getStoreById);
storesRouter.patch(
  '/:id/status',
  validate(z.object({ isOpen: z.boolean() })),
  updateStoreStatus,
);
```

- [ ] **Step 5: Create `services/store-service/src/app.ts`**

```typescript
import express from 'express';
import helmet from 'helmet';
import { storesRouter } from './routes/stores.js';
import { menuRouter } from './routes/menu.js';

export function createApp(): express.Application {
  const app = express();
  app.use(helmet());
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'store-service' }));
  app.use('/api/stores', storesRouter);
  app.use('/api/menu', menuRouter);

  return app;
}
```

- [ ] **Step 6: Create `services/store-service/src/index.ts`**

```typescript
import 'dotenv/config';
import { createApp } from './app.js';

const PORT = process.env['PORT'] ?? 3001;
createApp().listen(PORT, () => {
  console.log(`[store-service] running on port ${PORT}`);
});
```

- [ ] **Step 7: Run tests — verify they pass**

```bash
cd services/store-service && npm test
```

Expected: All 3 store tests PASS.

- [ ] **Step 8: Commit**

```bash
git add services/store-service/src/
git commit -m "feat: store-service stores CRUD with PostGIS nearby query and Kafka events"
```

---

## Task 3: Store Service — Menu Management

**Files:**
- Create: `services/store-service/src/controllers/menu.controller.ts`
- Create: `services/store-service/src/routes/menu.ts`
- Test: `services/store-service/src/__tests__/menu.test.ts`

- [ ] **Step 1: Write failing menu item test**

Create `services/store-service/src/__tests__/menu.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

vi.mock('../db/index.js', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          { id: 'item-1', name: 'Shawarma Plate', basePrice: '14.99' },
        ]),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { id: 'item-1', name: 'Shawarma Plate', basePrice: '14.99', isAvailable: true },
        ]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: 'item-1' }]),
      }),
    }),
  },
  menuItems: {},
  menuCategories: {},
}));

describe('GET /api/menu/:storeId', () => {
  it('returns menu items for a store', async () => {
    const app = createApp();
    const res = await request(app).get('/api/menu/store-1');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
  });
});

describe('PATCH /api/menu/items/:id/availability', () => {
  it('toggles item availability', async () => {
    const app = createApp();
    const res = await request(app)
      .patch('/api/menu/items/item-1/availability')
      .send({ isAvailable: false });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 422 when isAvailable missing', async () => {
    const app = createApp();
    const res = await request(app)
      .patch('/api/menu/items/item-1/availability')
      .send({});
    expect(res.status).toBe(422);
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd services/store-service && npm test
```

Expected: FAIL — menu route not found.

- [ ] **Step 3: Create `services/store-service/src/controllers/menu.controller.ts`**

```typescript
import type { Request, Response } from 'express';
import { db, menuItems, menuCategories, modifierGroups, modifiers } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

export const createMenuItemSchema = z.object({
  categoryId:  z.string().uuid(),
  name:        z.string().min(1),
  description: z.string().optional(),
  basePrice:   z.number().positive(),
  imageUrl:    z.string().url().optional(),
  isAvailable: z.boolean().default(true),
  isFeatured:  z.boolean().default(false),
  prepTimeMin: z.number().int().min(1).default(10),
  allergens:   z.array(z.string()).default([]),
  calories:    z.number().int().positive().optional(),
});

export type CreateMenuItemBody = z.infer<typeof createMenuItemSchema>;
export { createMenuItemSchema };

export async function getMenuByStore(req: Request, res: Response): Promise<void> {
  const { storeId } = req.params as { storeId: string };
  const items = await db.select().from(menuItems).where(eq(menuItems.storeId, storeId));
  res.json({ items });
}

export async function createMenuItem(req: Request, res: Response): Promise<void> {
  const body = req.body as CreateMenuItemBody;
  const { storeId } = req.params as { storeId: string };

  const [item] = await db
    .insert(menuItems)
    .values({ ...body, storeId, basePrice: String(body.basePrice) })
    .returning();

  res.status(201).json({ item });
}

export async function updateItemAvailability(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const { isAvailable } = req.body as { isAvailable: boolean };

  await db.update(menuItems).set({ isAvailable }).where(eq(menuItems.id, id));
  res.json({ success: true });
}

export async function deleteMenuItem(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  await db.delete(menuItems).where(eq(menuItems.id, id));
  res.json({ success: true });
}
```

- [ ] **Step 4: Create `services/store-service/src/routes/menu.ts`**

```typescript
import { Router } from 'express';
import { z } from 'zod';
import {
  getMenuByStore,
  createMenuItem,
  updateItemAvailability,
  deleteMenuItem,
  createMenuItemSchema,
} from '../controllers/menu.controller.js';
import { validate } from '../middleware/validate.js';

export const menuRouter = Router();

menuRouter.get('/:storeId', getMenuByStore);
menuRouter.post('/:storeId/items', validate(createMenuItemSchema), createMenuItem);
menuRouter.patch(
  '/items/:id/availability',
  validate(z.object({ isAvailable: z.boolean() })),
  updateItemAvailability,
);
menuRouter.delete('/items/:id', deleteMenuItem);
```

- [ ] **Step 5: Run all store-service tests**

```bash
cd services/store-service && npm test
```

Expected: All 6 tests PASS (3 store + 3 menu).

- [ ] **Step 6: Commit**

```bash
git add services/store-service/src/
git commit -m "feat: store-service menu CRUD with availability toggle"
```

---

## Task 4: Order Service — FSM (TDD)

The state machine is the most critical piece in the order service. Test every valid and invalid transition.

**Files:**
- Create: `services/order-service/src/fsm/orderFSM.ts`
- Test: `services/order-service/src/__tests__/orderFSM.test.ts`

- [ ] **Step 1: Write failing FSM tests**

Create `services/order-service/src/__tests__/orderFSM.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { OrderFSM, InvalidTransitionError } from '../fsm/orderFSM.js';

describe('OrderFSM — valid transitions', () => {
  it('pending → confirmed', () => {
    const fsm = new OrderFSM('pending');
    expect(fsm.transition('confirmed')).toBe('confirmed');
  });

  it('pending → cancelled', () => {
    const fsm = new OrderFSM('pending');
    expect(fsm.transition('cancelled')).toBe('cancelled');
  });

  it('confirmed → preparing', () => {
    const fsm = new OrderFSM('confirmed');
    expect(fsm.transition('preparing')).toBe('preparing');
  });

  it('confirmed → cancelled', () => {
    const fsm = new OrderFSM('confirmed');
    expect(fsm.transition('cancelled')).toBe('cancelled');
  });

  it('preparing → ready', () => {
    const fsm = new OrderFSM('preparing');
    expect(fsm.transition('ready')).toBe('ready');
  });

  it('ready → picked_up', () => {
    const fsm = new OrderFSM('ready');
    expect(fsm.transition('picked_up')).toBe('picked_up');
  });

  it('picked_up → delivered', () => {
    const fsm = new OrderFSM('picked_up');
    expect(fsm.transition('delivered')).toBe('delivered');
  });
});

describe('OrderFSM — invalid transitions', () => {
  it('throws on delivered → preparing', () => {
    const fsm = new OrderFSM('delivered');
    expect(() => fsm.transition('preparing')).toThrow(InvalidTransitionError);
  });

  it('throws on cancelled → confirmed', () => {
    const fsm = new OrderFSM('cancelled');
    expect(() => fsm.transition('confirmed')).toThrow(InvalidTransitionError);
  });

  it('throws on pending → delivered', () => {
    const fsm = new OrderFSM('pending');
    expect(() => fsm.transition('delivered')).toThrow(InvalidTransitionError);
  });

  it('throws on preparing → cancelled', () => {
    const fsm = new OrderFSM('preparing');
    expect(() => fsm.transition('cancelled')).toThrow(InvalidTransitionError);
  });

  it('error message includes current and target status', () => {
    const fsm = new OrderFSM('delivered');
    expect(() => fsm.transition('preparing')).toThrow(
      'Cannot transition from delivered to preparing',
    );
  });
});

describe('OrderFSM — canTransition', () => {
  it('returns true for valid transition', () => {
    const fsm = new OrderFSM('pending');
    expect(fsm.canTransition('confirmed')).toBe(true);
  });

  it('returns false for invalid transition', () => {
    const fsm = new OrderFSM('delivered');
    expect(fsm.canTransition('preparing')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd services/order-service && npm test
```

Expected: FAIL — `Cannot find module '../fsm/orderFSM.js'`

- [ ] **Step 3: Implement `services/order-service/src/fsm/orderFSM.ts`**

```typescript
import { ORDER_TRANSITIONS } from '@halalgo/types';
import type { OrderStatus } from '@halalgo/types';

export class InvalidTransitionError extends Error {
  constructor(from: OrderStatus, to: OrderStatus) {
    super(`Cannot transition from ${from} to ${to}`);
    this.name = 'InvalidTransitionError';
  }
}

export class OrderFSM {
  private current: OrderStatus;

  constructor(initialStatus: OrderStatus) {
    this.current = initialStatus;
  }

  get status(): OrderStatus {
    return this.current;
  }

  canTransition(to: OrderStatus): boolean {
    return ORDER_TRANSITIONS[this.current]?.includes(to) ?? false;
  }

  transition(to: OrderStatus): OrderStatus {
    if (!this.canTransition(to)) {
      throw new InvalidTransitionError(this.current, to);
    }
    this.current = to;
    return this.current;
  }
}
```

- [ ] **Step 4: Run FSM tests — verify they all pass**

```bash
cd services/order-service && npm test
```

Expected: All 15 FSM tests PASS.

- [ ] **Step 5: Commit**

```bash
git add services/order-service/src/fsm/
git commit -m "feat: order FSM with full transition validation (TDD)"
```

---

## Task 5: Order Service — Orders Controller + Routes

**Files:**
- Create: `services/order-service/src/controllers/orders.controller.ts`
- Create: `services/order-service/src/routes/orders.ts`
- Create: `services/order-service/src/app.ts`
- Create: `services/order-service/src/index.ts`
- Test: `services/order-service/src/__tests__/orders.test.ts`

- [ ] **Step 1: Write failing order creation test**

Create `services/order-service/src/__tests__/orders.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

vi.mock('../db/index.js', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: 'order-1',
            status: 'pending',
            total: '35.50',
            clerkCustomerId: 'user_123',
          },
        ]),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { id: 'order-1', status: 'pending', clerkCustomerId: 'user_123' },
        ]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'order-1', status: 'confirmed' }]),
        }),
      }),
    }),
  },
  orders: {},
  orderItems: {},
  orderStatusHistory: {},
}));

vi.mock('@halalgo/kafka', () => ({
  publishEvent: vi.fn().mockResolvedValue(undefined),
  KAFKA_TOPICS: {
    ORDER_CREATED: 'order.created',
    ORDER_STATUS_UPDATED: 'order.status.updated',
    ORDER_COMPLETED: 'order.completed',
    ORDER_CANCELLED: 'order.cancelled',
  },
}));

describe('POST /api/orders', () => {
  it('creates an order and returns pending status', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/orders')
      .set('x-clerk-user-id', 'user_123')
      .send({
        storeId: 'store-1',
        items: [{ menuItemId: 'item-1', quantity: 2, unitPrice: 14.99, selectedModifiers: [] }],
        deliveryAddress: {
          street: '123 Main St', city: 'Ottawa',
          province: 'ON', postalCode: 'K1A 0A9',
          latitude: 45.42, longitude: -75.70,
        },
        subtotal: 29.98,
        deliveryFee: 2.99,
        tip: 0,
        promoCodeUsed: null,
        specialInstructions: null,
      });
    expect(res.status).toBe(201);
    expect(res.body.order.status).toBe('pending');
  });

  it('returns 422 when storeId missing', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/orders')
      .set('x-clerk-user-id', 'user_123')
      .send({ items: [] });
    expect(res.status).toBe(422);
  });
});

describe('PATCH /api/orders/:id/status', () => {
  it('transitions order status', async () => {
    const app = createApp();
    const res = await request(app)
      .patch('/api/orders/order-1/status')
      .set('x-clerk-user-id', 'store_owner')
      .send({ status: 'confirmed', changedByRole: 'store' });
    expect(res.status).toBe(200);
  });

  it('rejects invalid transition', async () => {
    const { db } = await import('../db/index.js');
    (db.select as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { id: 'order-1', status: 'delivered', clerkCustomerId: 'user_123' },
        ]),
      }),
    });
    const app = createApp();
    const res = await request(app)
      .patch('/api/orders/order-1/status')
      .set('x-clerk-user-id', 'store_owner')
      .send({ status: 'preparing', changedByRole: 'store' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/cannot transition/i);
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd services/order-service && npm test -- --reporter=verbose
```

Expected: FAIL — `Cannot find module '../app.js'`

- [ ] **Step 3: Create `services/order-service/src/controllers/orders.controller.ts`**

```typescript
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
  selectedModifiers: z.array(z.object({ modifierId: z.string(), name: z.string(), priceDelta: z.number() })).default([]),
  specialRequests:   z.string().optional(),
});

const deliveryAddressSchema = z.object({
  street:    z.string(),
  city:      z.string(),
  province:  z.string().length(2),
  postalCode: z.string(),
  latitude:  z.number(),
  longitude: z.number(),
  label:     z.string().optional(),
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

export { createOrderSchema, updateStatusSchema };

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

  await db.insert(orderItems).values(
    body.items.map((item) => ({
      orderId:           order!.id,
      menuItemId:        item.menuItemId,
      quantity:          item.quantity,
      unitPrice:         String(item.unitPrice),
      selectedModifiers: item.selectedModifiers,
      specialRequests:   item.specialRequests ?? null,
    })),
  );

  await db.insert(orderStatusHistory).values({
    orderId:       order!.id,
    status:        'pending',
    changedByRole: 'system',
  });

  await publishEvent(KAFKA_TOPICS.ORDER_CREATED, {
    orderId:         order!.id,
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
    orderId:        id,
    previousStatus: order.status,
    newStatus,
    changedByRole:  changedByRole as ChangedByRole,
    clerkCustomerId: order.clerkCustomerId,
    storeId:        order.storeId,
    driverId:       order.driverId,
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
```

- [ ] **Step 4: Create `services/order-service/src/routes/orders.ts`**

```typescript
import { Router } from 'express';
import {
  createOrder,
  updateOrderStatus,
  getOrderById,
  createOrderSchema,
  updateStatusSchema,
} from '../controllers/orders.controller.js';
import { validate } from '../middleware/validate.js';

export const ordersRouter = Router();

ordersRouter.post('/', validate(createOrderSchema), createOrder);
ordersRouter.get('/:id', getOrderById);
ordersRouter.patch('/:id/status', validate(updateStatusSchema), updateOrderStatus);
```

- [ ] **Step 5: Create `services/order-service/src/app.ts`**

```typescript
import express from 'express';
import helmet from 'helmet';
import { ordersRouter } from './routes/orders.js';

export function createApp(): express.Application {
  const app = express();
  app.use(helmet());
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'order-service' }));
  app.use('/api/orders', ordersRouter);

  return app;
}
```

- [ ] **Step 6: Create `services/order-service/src/index.ts`**

```typescript
import 'dotenv/config';
import { createApp } from './app.js';

const PORT = process.env['PORT'] ?? 3002;
createApp().listen(PORT, () => {
  console.log(`[order-service] running on port ${PORT}`);
});
```

- [ ] **Step 7: Run all order-service tests**

```bash
cd services/order-service && npm install && npm test
```

Expected: All tests PASS (15 FSM + 4 order controller).

- [ ] **Step 8: Commit**

```bash
git add services/order-service/src/
git commit -m "feat: order-service with FSM state machine, Kafka events, and tax calculation"
```

---

## Task 6: Customer Service — Profiles + Addresses

**Files:**
- Create: `services/customer-service/src/controllers/profiles.controller.ts`
- Create: `services/customer-service/src/controllers/addresses.controller.ts`
- Create: `services/customer-service/src/routes/profiles.ts`
- Create: `services/customer-service/src/routes/addresses.ts`
- Create: `services/customer-service/src/app.ts`
- Create: `services/customer-service/src/index.ts`
- Test: `services/customer-service/src/__tests__/addresses.test.ts`

- [ ] **Step 1: Write failing address test**

Create `services/customer-service/src/__tests__/addresses.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

vi.mock('../db/index.js', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          { id: 'addr-1', label: 'Home', city: 'Ottawa', isDefault: true },
        ]),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { id: 'addr-1', label: 'Home', city: 'Ottawa', isDefault: true },
        ]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
    }),
  },
  addresses: {},
  customerProfiles: {},
}));

describe('POST /api/addresses', () => {
  it('creates address and returns 201', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/addresses')
      .set('x-clerk-user-id', 'user_123')
      .send({
        label: 'Home',
        street: '123 Main St',
        city: 'Ottawa',
        province: 'ON',
        postalCode: 'K1A 0A9',
        latitude: 45.42,
        longitude: -75.70,
        isDefault: true,
      });
    expect(res.status).toBe(201);
    expect(res.body.address.city).toBe('Ottawa');
  });

  it('returns 422 when province missing', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/addresses')
      .set('x-clerk-user-id', 'user_123')
      .send({ label: 'Home', street: '123', city: 'Ottawa' });
    expect(res.status).toBe(422);
  });
});

describe('GET /api/addresses', () => {
  it('returns user addresses', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/api/addresses')
      .set('x-clerk-user-id', 'user_123');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.addresses)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd services/customer-service && npm test
```

Expected: FAIL — `Cannot find module '../app.js'`

- [ ] **Step 3: Create `services/customer-service/src/controllers/addresses.controller.ts`**

```typescript
import type { Request, Response } from 'express';
import { db, addresses } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

export const createAddressSchema = z.object({
  label:      z.string().default('Home'),
  street:     z.string().min(1),
  city:       z.string().min(1),
  province:   z.string().length(2),
  postalCode: z.string().min(3),
  latitude:   z.number().min(-90).max(90),
  longitude:  z.number().min(-180).max(180),
  isDefault:  z.boolean().default(false),
});

export type CreateAddressBody = z.infer<typeof createAddressSchema>;
export { createAddressSchema };

export async function getAddresses(req: Request, res: Response): Promise<void> {
  const clerkUserId = req.headers['x-clerk-user-id'] as string;
  const rows = await db.select().from(addresses).where(eq(addresses.clerkUserId, clerkUserId));
  res.json({ addresses: rows });
}

export async function createAddress(req: Request, res: Response): Promise<void> {
  const clerkUserId = req.headers['x-clerk-user-id'] as string;
  const body = req.body as CreateAddressBody;

  const [address] = await db
    .insert(addresses)
    .values({ ...body, clerkUserId })
    .returning();

  res.status(201).json({ address });
}

export async function deleteAddress(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  await db.delete(addresses).where(eq(addresses.id, id));
  res.json({ success: true });
}
```

- [ ] **Step 4: Create `services/customer-service/src/controllers/profiles.controller.ts`**

```typescript
import type { Request, Response } from 'express';
import { db, customerProfiles } from '../db/index.js';
import { eq } from 'drizzle-orm';

export async function getProfile(req: Request, res: Response): Promise<void> {
  const clerkUserId = req.headers['x-clerk-user-id'] as string;
  const rows = await db.select().from(customerProfiles).where(eq(customerProfiles.clerkUserId, clerkUserId));

  if (rows.length === 0) {
    // Auto-create profile on first access
    const [profile] = await db.insert(customerProfiles).values({ clerkUserId }).returning();
    res.json({ profile });
    return;
  }

  res.json({ profile: rows[0] });
}
```

- [ ] **Step 5: Create routes**

Create `services/customer-service/src/routes/addresses.ts`:

```typescript
import { Router } from 'express';
import {
  getAddresses,
  createAddress,
  deleteAddress,
  createAddressSchema,
} from '../controllers/addresses.controller.js';
import { validate } from '../middleware/validate.js';

export const addressesRouter = Router();

addressesRouter.get('/', getAddresses);
addressesRouter.post('/', validate(createAddressSchema), createAddress);
addressesRouter.delete('/:id', deleteAddress);
```

Create `services/customer-service/src/routes/profiles.ts`:

```typescript
import { Router } from 'express';
import { getProfile } from '../controllers/profiles.controller.js';

export const profilesRouter = Router();
profilesRouter.get('/', getProfile);
```

- [ ] **Step 6: Create `services/customer-service/src/app.ts`**

```typescript
import express from 'express';
import helmet from 'helmet';
import { profilesRouter } from './routes/profiles.js';
import { addressesRouter } from './routes/addresses.js';

export function createApp(): express.Application {
  const app = express();
  app.use(helmet());
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'customer-service' }));
  app.use('/api/profile', profilesRouter);
  app.use('/api/addresses', addressesRouter);

  return app;
}
```

- [ ] **Step 7: Create `services/customer-service/src/index.ts`**

```typescript
import 'dotenv/config';
import { createApp } from './app.js';

const PORT = process.env['PORT'] ?? 3008;
createApp().listen(PORT, () => {
  console.log(`[customer-service] running on port ${PORT}`);
});
```

- [ ] **Step 8: Run all customer-service tests**

```bash
cd services/customer-service && npm install && npm test
```

Expected: All 4 address tests PASS.

- [ ] **Step 9: Commit**

```bash
git add services/customer-service/src/
git commit -m "feat: customer-service profiles and addresses with Zod validation"
```

---

## Task 7: Full Integration Smoke Test

- [ ] **Step 1: Start all 3 services in separate terminals**

Terminal 1:
```bash
cd services/store-service && npm run dev
```

Terminal 2:
```bash
cd services/order-service && npm run dev
```

Terminal 3:
```bash
cd services/customer-service && npm run dev
```

- [ ] **Step 2: Verify all health endpoints**

```bash
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3008/health
```

Expected: `{"status":"ok","service":"store-service"}` etc. from each.

- [ ] **Step 3: Create a test address via customer-service**

```bash
curl -X POST http://localhost:3008/api/addresses \
  -H "Content-Type: application/json" \
  -H "x-clerk-user-id: test_user_1" \
  -d '{"label":"Home","street":"123 Main St","city":"Ottawa","province":"ON","postalCode":"K1A0A9","latitude":45.4215,"longitude":-75.6972,"isDefault":true}'
```

Expected: `{"address":{"id":"...","label":"Home","city":"Ottawa",...}}`

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "chore: plan 3 complete — store, order, customer services running"
```

---

## Self-Review Checklist

- [x] FSM: all 15 transitions tested, invalid ones throw `InvalidTransitionError` with descriptive message
- [x] Kafka events published on: order.created, order.status.updated, order.completed, order.cancelled, store.status.changed
- [x] Tax calculation uses `@halalgo/utils` — all Canadian provinces covered
- [x] Zod validation on all POST/PATCH bodies — 422 on invalid input
- [x] Cross-service references are text IDs only (no FK constraints across schemas)
- [x] `x-clerk-user-id` header used for user identification (set by api-gateway after Clerk verification)
- [x] No placeholders — all code complete
- [x] Type consistency: `OrderStatus`, `ChangedByRole`, `CanadianProvince` imported from `@halalgo/types` and `@halalgo/utils`
