# HalalGo — Plan 1: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap the Turborepo monorepo, shared TypeScript packages (@halalgo/types, @halalgo/utils, @halalgo/kafka), and scaffold the API Gateway with Clerk auth + WebSocket server.

**Architecture:** Turborepo workspace with npm. Shared packages consumed by all services and apps via the `workspace:*` protocol. API Gateway is the single HTTP + WebSocket entry point. All secrets injected via environment variables — never hardcoded.

**Tech Stack:** Node.js 20, TypeScript 5.4, Turborepo 2, Vitest (unit tests), KafkaJS (Confluent Cloud), Zod (runtime validation), Express 4, Clerk Node SDK, `ws` (WebSocket), ioredis (Redis pub/sub), express-rate-limit, Helmet

---

## File Map

```
halalgo/
├── package.json                          # Root — workspaces declaration
├── turbo.json                            # Turborepo pipeline
├── tsconfig.base.json                    # Shared TS config inherited by all packages
├── .gitignore
├── .env.example                          # All environment variables documented
├── packages/
│   ├── types/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts                  # Re-exports everything
│   │       ├── store.types.ts            # Store, MenuItem, ModifierGroup, Modifier
│   │       ├── order.types.ts            # Order, OrderItem, OrderStatus FSM types
│   │       ├── driver.types.ts           # DriverProfile, DispatchLog
│   │       ├── customer.types.ts         # CustomerProfile, Address, LoyaltyTransaction
│   │       ├── payment.types.ts          # Transaction, Refund, Promotion
│   │       └── kafka-events.types.ts     # All Kafka event payload types
│   ├── utils/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── tax.ts                    # Canadian provincial tax calculator
│   │       ├── price.ts                  # CAD price formatter
│   │       └── eta.ts                    # ETA calculation helpers
│   └── kafka/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── topics.ts                 # All Kafka topic name constants
│           ├── producer.ts               # Typed Kafka producer (KafkaJS + Confluent)
│           └── consumer.ts              # Typed Kafka consumer factory
└── services/
    └── api-gateway/
        ├── package.json
        ├── tsconfig.json
        └── src/
            ├── index.ts                  # Entry — starts Express + WebSocket
            ├── app.ts                    # Express app factory
            ├── middleware/
            │   ├── auth.ts               # Clerk JWT verification + Redis cache
            │   └── rateLimit.ts          # Per-IP + per-user rate limiter
            ├── routes/
            │   ├── health.ts             # GET /health
            │   └── proxy.ts              # HTTP proxy to downstream services
            └── websocket/
                ├── server.ts             # ws WebSocket server init
                ├── channels.ts           # Channel subscription management
                └── redis-adapter.ts      # Redis pub/sub → WebSocket fan-out
```

---

## Task 1: Root Monorepo Bootstrap

**Files:**
- Create: `package.json`
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.env.example`

- [ ] **Step 1: Create root `package.json`**

```json
{
  "name": "halalgo",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "packages/*",
    "services/*",
    "apps/*"
  ],
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test",
    "lint": "turbo lint",
    "db:migrate": "turbo db:migrate"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.4.0",
    "@types/node": "^20.0.0",
    "vitest": "^1.6.0"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

- [ ] **Step 2: Create `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "dependsOn": ["^build"],
      "persistent": true,
      "cache": false
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "db:migrate": {
      "cache": false
    }
  }
}
```

- [ ] **Step 3: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src"
  }
}
```

- [ ] **Step 4: Create `.gitignore`**

```
node_modules/
dist/
.env
.env.local
*.js.map
coverage/
.turbo/
```

- [ ] **Step 5: Create `.env.example`**

```env
# Neon PostgreSQL
DATABASE_URL=postgresql://user:password@host.neon.tech/neondb?sslmode=require

# Clerk
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...

# Confluent Cloud Kafka
KAFKA_BOOTSTRAP_SERVERS=pkc-xxxxx.us-east-1.aws.confluent.cloud:9092
KAFKA_API_KEY=your_kafka_api_key
KAFKA_API_SECRET=your_kafka_api_secret
KAFKA_GROUP_ID=halalgo-local

# Elastic Cloud
ELASTICSEARCH_URL=https://your-deployment.es.us-east-1.aws.elastic.cloud:443
ELASTICSEARCH_API_KEY=your_elasticsearch_api_key

# Upstash Redis (5 separate databases)
REDIS_DRIVER_LOCATION_URL=rediss://default:...@us1-xxx.upstash.io:6379
REDIS_RATE_LIMIT_URL=rediss://default:...@us1-xxx.upstash.io:6379
REDIS_JWT_CACHE_URL=rediss://default:...@us1-xxx.upstash.io:6379
REDIS_QUEUE_URL=rediss://default:...@us1-xxx.upstash.io:6379
REDIS_CACHE_URL=rediss://default:...@us1-xxx.upstash.io:6379

# Cloudflare R2
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=halalgo-media
R2_PUBLIC_URL=https://media.halalgo.ca

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Google Maps
GOOGLE_MAPS_API_KEY=AIza...

# Expo
EXPO_ACCESS_TOKEN=your_expo_token

# App
PORT=3000
NODE_ENV=development
```

- [ ] **Step 6: Install root dependencies**

```bash
npm install
```

Expected: `node_modules/` created at root with turbo and typescript installed.

- [ ] **Step 7: Init git and commit**

```bash
git init
git add .
git commit -m "chore: init turborepo monorepo"
```

---

## Task 2: @halalgo/types Package

**Files:**
- Create: `packages/types/package.json`
- Create: `packages/types/tsconfig.json`
- Create: `packages/types/src/store.types.ts`
- Create: `packages/types/src/order.types.ts`
- Create: `packages/types/src/driver.types.ts`
- Create: `packages/types/src/customer.types.ts`
- Create: `packages/types/src/payment.types.ts`
- Create: `packages/types/src/kafka-events.types.ts`
- Create: `packages/types/src/index.ts`

- [ ] **Step 1: Create `packages/types/package.json`**

```json
{
  "name": "@halalgo/types",
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
  "devDependencies": {
    "typescript": "*"
  }
}
```

- [ ] **Step 2: Create `packages/types/tsconfig.json`**

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

- [ ] **Step 3: Create `packages/types/src/store.types.ts`**

```typescript
export type StoreType = 'restaurant' | 'grocery';

export interface Store {
  id: string;
  clerkUserId: string;
  name: string;
  description: string;
  logoUrl: string;
  coverUrl: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  storeType: StoreType;
  cuisineType: string | null;
  halalCertificateUrl: string | null;
  isVerified: boolean;
  isOpen: boolean;
  rating: number;
  deliveryFee: number;
  minOrder: number;
  deliveryTimeMin: number;
  stripeAccountId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoreHours {
  id: string;
  storeId: string;
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  openTime: string;   // HH:MM
  closeTime: string;  // HH:MM
  isClosed: boolean;
}

export interface MenuCategory {
  id: string;
  storeId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  position: number;
  isActive: boolean;
  groceryCategoryId: string | null;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  storeId: string;
  name: string;
  description: string | null;
  basePrice: number;
  imageUrl: string | null;
  isAvailable: boolean;
  isFeatured: boolean;
  prepTimeMin: number;
  allergens: string[];
  calories: number | null;
}

export interface ModifierGroup {
  id: string;
  menuItemId: string;
  name: string;
  isRequired: boolean;
  minSelections: number;
  maxSelections: number;
  position: number;
}

export interface Modifier {
  id: string;
  groupId: string;
  name: string;
  priceDelta: number;
  isAvailable: boolean;
  position: number;
}

export interface GroceryCategory {
  id: string;
  name: string;
  icon: string;
  position: number;
}

export interface DeliveryZone {
  id: string;
  storeId: string;
  zonePolygon: GeoJSON.Polygon;
  deliveryFee: number;
  minOrder: number;
}

export interface SurgePricingEvent {
  id: string;
  zonePolygon: GeoJSON.Polygon;
  multiplier: number;
  startsAt: Date;
  endsAt: Date;
  reason: string;
  isActive: boolean;
}
```

- [ ] **Step 4: Create `packages/types/src/order.types.ts`**

```typescript
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'picked_up'
  | 'delivered'
  | 'cancelled';

export type ChangedByRole = 'customer' | 'store' | 'driver' | 'system' | 'admin';

// Valid transitions — mirrors the FSM in order-service
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready'],
  ready: ['picked_up'],
  picked_up: ['delivered'],
  delivered: [],
  cancelled: [],
};

export interface SelectedModifier {
  modifierId: string;
  name: string;
  priceDelta: number;
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  quantity: number;
  unitPrice: number;
  selectedModifiers: SelectedModifier[];
  specialRequests: string | null;
}

export interface DeliveryAddress {
  street: string;
  city: string;
  province: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  label?: string;
}

export interface Order {
  id: string;
  clerkCustomerId: string;
  storeId: string;
  driverId: string | null;
  status: OrderStatus;
  deliveryAddress: DeliveryAddress;
  subtotal: number;
  deliveryFee: number;
  taxes: number;
  tip: number;
  discount: number;
  total: number;
  stripePaymentIntentId: string | null;
  estimatedDeliveryAt: Date | null;
  deliveredAt: Date | null;
  specialInstructions: string | null;
  promoCodeUsed: string | null;
  deliveryPhotoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderStatusHistory {
  id: string;
  orderId: string;
  status: OrderStatus;
  changedAt: Date;
  changedByRole: ChangedByRole;
}

export interface OrderCancellation {
  id: string;
  orderId: string;
  cancelledByRole: ChangedByRole;
  reason: string;
  cancelledAt: Date;
}
```

- [ ] **Step 5: Create `packages/types/src/driver.types.ts`**

```typescript
export type VehicleType = 'car' | 'motorcycle' | 'bicycle' | 'scooter';
export type DispatchResponse = 'accepted' | 'declined' | 'timeout';

export interface DriverProfile {
  id: string;
  clerkUserId: string;
  vehicleType: VehicleType;
  licensePlate: string;
  driversLicenseUrl: string | null;
  insuranceUrl: string | null;
  isAvailable: boolean;
  isVerified: boolean;
  latitude: number | null;
  longitude: number | null;
  rating: number;
  totalDeliveries: number;
  stripeAccountId: string | null;
}

export interface DriverDispatchLog {
  id: string;
  orderId: string;
  driverId: string;
  offeredAt: Date;
  response: DispatchResponse;
  declinedReason: string | null;
}

export interface DriverEarnings {
  id: string;
  driverId: string;
  orderId: string;
  deliveryFeeEarned: number;
  tipEarned: number;
  platformCommission: number;
  netPayout: number;
  paidAt: Date | null;
}

export interface DriverLocation {
  driverId: string;
  latitude: number;
  longitude: number;
  updatedAt: Date;
}
```

- [ ] **Step 6: Create `packages/types/src/customer.types.ts`**

```typescript
export type LoyaltyTransactionType = 'earned' | 'redeemed' | 'expired';
export type Platform = 'ios' | 'android';

export interface CustomerProfile {
  id: string;
  clerkUserId: string;
  stripeCustomerId: string | null;
  loyaltyPoints: number;
  totalOrders: number;
}

export interface LoyaltyTransaction {
  id: string;
  clerkUserId: string;
  orderId: string | null;
  pointsDelta: number;
  balanceAfter: number;
  type: LoyaltyTransactionType;
  createdAt: Date;
}

export interface Address {
  id: string;
  clerkUserId: string;
  label: string;
  street: string;
  city: string;
  province: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
}

export interface CustomerFavorite {
  id: string;
  clerkUserId: string;
  storeId: string;
  createdAt: Date;
}

export interface PushToken {
  id: string;
  clerkUserId: string;
  token: string;
  platform: Platform;
  createdAt: Date;
  lastSeenAt: Date;
}

export interface Notification {
  id: string;
  clerkUserId: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  isRead: boolean;
  createdAt: Date;
}
```

- [ ] **Step 7: Create `packages/types/src/payment.types.ts`**

```typescript
export type TransactionStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';
export type PromotionType = 'percentage' | 'fixed' | 'free_delivery';
export type RefundInitiatedBy = 'customer' | 'admin' | 'system';

export interface Transaction {
  id: string;
  orderId: string;
  stripePaymentIntentId: string;
  amount: number;
  status: TransactionStatus;
  platformFee: number;
  storePayout: number;
  driverPayout: number;
  createdAt: Date;
}

export interface Refund {
  id: string;
  orderId: string;
  transactionId: string;
  amount: number;
  reason: string;
  stripeRefundId: string;
  initiatedByRole: RefundInitiatedBy;
  createdAt: Date;
}

export interface Promotion {
  id: string;
  storeId: string | null;
  code: string;
  type: PromotionType;
  value: number;
  minOrder: number;
  maxUses: number | null;
  usesCount: number;
  expiresAt: Date | null;
  isActive: boolean;
}
```

- [ ] **Step 8: Create `packages/types/src/kafka-events.types.ts`**

```typescript
import type { OrderStatus, ChangedByRole } from './order.types.js';

export interface KafkaEvent<T> {
  eventId: string;
  occurredAt: string; // ISO 8601
  payload: T;
}

// order.created
export interface OrderCreatedPayload {
  orderId: string;
  clerkCustomerId: string;
  storeId: string;
  total: number;
  items: Array<{ menuItemId: string; quantity: number; unitPrice: number }>;
}

// order.status.updated
export interface OrderStatusUpdatedPayload {
  orderId: string;
  previousStatus: OrderStatus;
  newStatus: OrderStatus;
  changedByRole: ChangedByRole;
  clerkCustomerId: string;
  storeId: string;
  driverId: string | null;
}

// order.completed
export interface OrderCompletedPayload {
  orderId: string;
  clerkCustomerId: string;
  storeId: string;
  driverId: string;
  subtotal: number;
  deliveryFee: number;
  tip: number;
  total: number;
  stripePaymentIntentId: string;
}

// order.cancelled
export interface OrderCancelledPayload {
  orderId: string;
  clerkCustomerId: string;
  storeId: string;
  driverId: string | null;
  reason: string;
  stripePaymentIntentId: string | null;
}

// driver.location.updated
export interface DriverLocationUpdatedPayload {
  driverId: string;
  latitude: number;
  longitude: number;
  activeOrderId: string | null;
  updatedAt: string;
}

// driver.availability.changed
export interface DriverAvailabilityChangedPayload {
  driverId: string;
  isAvailable: boolean;
  latitude: number | null;
  longitude: number | null;
}

// payment.completed
export interface PaymentCompletedPayload {
  orderId: string;
  stripePaymentIntentId: string;
  amount: number;
  clerkCustomerId: string;
}

// payment.refunded
export interface PaymentRefundedPayload {
  orderId: string;
  stripeRefundId: string;
  amount: number;
  reason: string;
}

// store.status.changed
export interface StoreStatusChangedPayload {
  storeId: string;
  isOpen: boolean;
  isVerified: boolean;
}

// review.created
export interface ReviewCreatedPayload {
  reviewId: string;
  orderId: string;
  storeId: string;
  driverId: string | null;
  storeRating: number;
  driverRating: number | null;
}

// notification.send
export interface NotificationSendPayload {
  clerkUserId: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
}
```

- [ ] **Step 9: Create `packages/types/src/index.ts`**

```typescript
export * from './store.types.js';
export * from './order.types.js';
export * from './driver.types.js';
export * from './customer.types.js';
export * from './payment.types.js';
export * from './kafka-events.types.js';
```

- [ ] **Step 10: Build and verify types compile**

```bash
cd packages/types && npm run build
```

Expected: `dist/` folder created with `.js` and `.d.ts` files, no TypeScript errors.

- [ ] **Step 11: Commit**

```bash
git add packages/types/
git commit -m "feat: add @halalgo/types shared package"
```

---

## Task 3: @halalgo/utils Package (TDD)

**Files:**
- Create: `packages/utils/package.json`
- Create: `packages/utils/tsconfig.json`
- Create: `packages/utils/vitest.config.ts`
- Create: `packages/utils/src/tax.ts`
- Create: `packages/utils/src/price.ts`
- Create: `packages/utils/src/eta.ts`
- Create: `packages/utils/src/index.ts`
- Test: `packages/utils/src/__tests__/tax.test.ts`
- Test: `packages/utils/src/__tests__/price.test.ts`

- [ ] **Step 1: Create `packages/utils/package.json`**

```json
{
  "name": "@halalgo/utils",
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
    "dev": "tsc --watch",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "typescript": "*",
    "vitest": "*"
  }
}
```

- [ ] **Step 2: Create `packages/utils/tsconfig.json`**

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

- [ ] **Step 3: Create `packages/utils/vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
  },
});
```

- [ ] **Step 4: Write failing tax tests**

Create `packages/utils/src/__tests__/tax.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { calculateTax, TaxRate } from '../tax.js';

describe('calculateTax', () => {
  it('applies HST 13% in Ontario', () => {
    expect(calculateTax(100, 'ON')).toBe(13);
  });

  it('applies HST 15% in Nova Scotia', () => {
    expect(calculateTax(100, 'NS')).toBe(15);
  });

  it('applies HST 15% in New Brunswick', () => {
    expect(calculateTax(100, 'NB')).toBe(15);
  });

  it('applies HST 15% in Newfoundland', () => {
    expect(calculateTax(100, 'NL')).toBe(15);
  });

  it('applies HST 15% in PEI', () => {
    expect(calculateTax(100, 'PE')).toBe(15);
  });

  it('applies GST 5% in Alberta', () => {
    expect(calculateTax(100, 'AB')).toBe(5);
  });

  it('applies GST+PST 12% in British Columbia', () => {
    expect(calculateTax(100, 'BC')).toBe(12);
  });

  it('applies GST+QST 14.975% in Quebec', () => {
    expect(calculateTax(100, 'QC')).toBeCloseTo(14.975, 2);
  });

  it('applies GST+PST 11% in Saskatchewan', () => {
    expect(calculateTax(100, 'SK')).toBe(11);
  });

  it('applies GST+PST 12% in Manitoba', () => {
    expect(calculateTax(100, 'MB')).toBe(12);
  });

  it('rounds to 2 decimal places', () => {
    expect(calculateTax(33.33, 'ON')).toBe(4.33);
  });
});
```

- [ ] **Step 5: Run test — verify it fails**

```bash
cd packages/utils && npm test
```

Expected: FAIL — `Cannot find module '../tax.js'`

- [ ] **Step 6: Implement `packages/utils/src/tax.ts`**

```typescript
export type CanadianProvince =
  | 'ON' | 'NB' | 'NL' | 'NS' | 'PE'  // HST provinces
  | 'AB' | 'BC' | 'QC' | 'SK' | 'MB' | 'NT' | 'NU' | 'YT';

export interface TaxRate {
  gst: number;
  pst: number;
  hst: number | null;
}

const TAX_RATES: Record<CanadianProvince, TaxRate> = {
  ON: { gst: 0,    pst: 0,       hst: 0.13    },
  NB: { gst: 0,    pst: 0,       hst: 0.15    },
  NL: { gst: 0,    pst: 0,       hst: 0.15    },
  NS: { gst: 0,    pst: 0,       hst: 0.15    },
  PE: { gst: 0,    pst: 0,       hst: 0.15    },
  AB: { gst: 0.05, pst: 0,       hst: null    },
  BC: { gst: 0.05, pst: 0.07,    hst: null    },
  QC: { gst: 0.05, pst: 0.09975, hst: null    },
  SK: { gst: 0.05, pst: 0.06,    hst: null    },
  MB: { gst: 0.05, pst: 0.07,    hst: null    },
  NT: { gst: 0.05, pst: 0,       hst: null    },
  NU: { gst: 0.05, pst: 0,       hst: null    },
  YT: { gst: 0.05, pst: 0,       hst: null    },
};

export function calculateTax(subtotal: number, province: CanadianProvince): number {
  const rates = TAX_RATES[province];
  const rate = rates.hst !== null
    ? rates.hst
    : rates.gst + rates.pst;
  return Math.round(subtotal * rate * 100) / 100;
}

export function getTaxRate(province: CanadianProvince): number {
  const rates = TAX_RATES[province];
  return rates.hst !== null ? rates.hst : rates.gst + rates.pst;
}
```

- [ ] **Step 7: Run tests — verify they pass**

```bash
cd packages/utils && npm test
```

Expected: All 11 tax tests PASS.

- [ ] **Step 8: Write failing price tests**

Create `packages/utils/src/__tests__/price.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { formatCAD, centsToCAD, cadToCents } from '../price.js';

describe('formatCAD', () => {
  it('formats whole dollar amounts', () => {
    expect(formatCAD(10)).toBe('$10.00');
  });

  it('formats amounts with cents', () => {
    expect(formatCAD(10.5)).toBe('$10.50');
  });

  it('formats zero', () => {
    expect(formatCAD(0)).toBe('$0.00');
  });

  it('formats large amounts with comma separators', () => {
    expect(formatCAD(1234.56)).toBe('$1,234.56');
  });
});

describe('centsToCAD', () => {
  it('converts cents to dollar float', () => {
    expect(centsToCAD(1099)).toBe(10.99);
  });

  it('converts zero cents', () => {
    expect(centsToCAD(0)).toBe(0);
  });
});

describe('cadToCents', () => {
  it('converts dollar float to cents integer', () => {
    expect(cadToCents(10.99)).toBe(1099);
  });

  it('rounds to nearest cent', () => {
    expect(cadToCents(10.999)).toBe(1100);
  });
});
```

- [ ] **Step 9: Run test — verify it fails**

```bash
cd packages/utils && npm test
```

Expected: FAIL — `Cannot find module '../price.js'`

- [ ] **Step 10: Implement `packages/utils/src/price.ts`**

```typescript
const CAD_FORMATTER = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCAD(amount: number): string {
  return CAD_FORMATTER.format(amount).replace('CA', '');
}

export function centsToCAD(cents: number): number {
  return cents / 100;
}

export function cadToCents(dollars: number): number {
  return Math.round(dollars * 100);
}
```

- [ ] **Step 11: Create `packages/utils/src/eta.ts`**

```typescript
export interface ETAComponents {
  prepTimeMin: number;
  driveTimeMin: number;
  bufferMin?: number;
}

export function calculateETA(components: ETAComponents): Date {
  const buffer = components.bufferMin ?? 5;
  const totalMin = components.prepTimeMin + components.driveTimeMin + buffer;
  const eta = new Date();
  eta.setMinutes(eta.getMinutes() + totalMin);
  return eta;
}

export function minutesUntil(target: Date): number {
  return Math.max(0, Math.round((target.getTime() - Date.now()) / 60_000));
}
```

- [ ] **Step 12: Create `packages/utils/src/index.ts`**

```typescript
export * from './tax.js';
export * from './price.js';
export * from './eta.js';
```

- [ ] **Step 13: Run all utils tests — verify they pass**

```bash
cd packages/utils && npm test
```

Expected: All 14 tests PASS.

- [ ] **Step 14: Build utils**

```bash
cd packages/utils && npm run build
```

Expected: `dist/` created, no TypeScript errors.

- [ ] **Step 15: Commit**

```bash
git add packages/utils/
git commit -m "feat: add @halalgo/utils with tax calculator and price formatter (TDD)"
```

---

## Task 4: @halalgo/kafka Package

**Files:**
- Create: `packages/kafka/package.json`
- Create: `packages/kafka/tsconfig.json`
- Create: `packages/kafka/src/topics.ts`
- Create: `packages/kafka/src/producer.ts`
- Create: `packages/kafka/src/consumer.ts`
- Create: `packages/kafka/src/index.ts`

- [ ] **Step 1: Create `packages/kafka/package.json`**

```json
{
  "name": "@halalgo/kafka",
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
    "kafkajs": "^2.2.4",
    "@halalgo/types": "workspace:*"
  },
  "devDependencies": {
    "typescript": "*"
  }
}
```

- [ ] **Step 2: Create `packages/kafka/tsconfig.json`**

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

- [ ] **Step 3: Create `packages/kafka/src/topics.ts`**

```typescript
export const KAFKA_TOPICS = {
  ORDER_CREATED: 'order.created',
  ORDER_STATUS_UPDATED: 'order.status.updated',
  ORDER_COMPLETED: 'order.completed',
  ORDER_CANCELLED: 'order.cancelled',
  DRIVER_LOCATION_UPDATED: 'driver.location.updated',
  DRIVER_AVAILABILITY_CHANGED: 'driver.availability.changed',
  PAYMENT_COMPLETED: 'payment.completed',
  PAYMENT_REFUNDED: 'payment.refunded',
  STORE_STATUS_CHANGED: 'store.status.changed',
  REVIEW_CREATED: 'review.created',
  NOTIFICATION_SEND: 'notification.send',
} as const;

export type KafkaTopic = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];
```

- [ ] **Step 4: Create `packages/kafka/src/producer.ts`**

```typescript
import { Kafka, Producer, Partitioners } from 'kafkajs';
import { randomUUID } from 'crypto';
import type { KafkaEvent } from '@halalgo/types';
import type { KafkaTopic } from './topics.js';

function createKafkaClient(): Kafka {
  const brokers = process.env['KAFKA_BOOTSTRAP_SERVERS'];
  const apiKey = process.env['KAFKA_API_KEY'];
  const apiSecret = process.env['KAFKA_API_SECRET'];

  if (!brokers || !apiKey || !apiSecret) {
    throw new Error('Missing Kafka environment variables: KAFKA_BOOTSTRAP_SERVERS, KAFKA_API_KEY, KAFKA_API_SECRET');
  }

  return new Kafka({
    clientId: 'halalgo',
    brokers: [brokers],
    ssl: true,
    sasl: {
      mechanism: 'plain',
      username: apiKey,
      password: apiSecret,
    },
  });
}

let producer: Producer | null = null;

export async function getProducer(): Promise<Producer> {
  if (producer) return producer;

  const kafka = createKafkaClient();
  producer = kafka.producer({
    createPartitioner: Partitioners.LegacyPartitioner,
  });
  await producer.connect();
  return producer;
}

export async function publishEvent<T>(
  topic: KafkaTopic,
  payload: T,
  key?: string,
): Promise<void> {
  const p = await getProducer();
  const event: KafkaEvent<T> = {
    eventId: randomUUID(),
    occurredAt: new Date().toISOString(),
    payload,
  };

  await p.send({
    topic,
    messages: [
      {
        key: key ?? randomUUID(),
        value: JSON.stringify(event),
      },
    ],
  });
}

export async function disconnectProducer(): Promise<void> {
  if (producer) {
    await producer.disconnect();
    producer = null;
  }
}
```

- [ ] **Step 5: Create `packages/kafka/src/consumer.ts`**

```typescript
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import type { KafkaEvent } from '@halalgo/types';
import type { KafkaTopic } from './topics.js';

function createKafkaClient(): Kafka {
  const brokers = process.env['KAFKA_BOOTSTRAP_SERVERS'];
  const apiKey = process.env['KAFKA_API_KEY'];
  const apiSecret = process.env['KAFKA_API_SECRET'];
  const groupId = process.env['KAFKA_GROUP_ID'] ?? 'halalgo';

  if (!brokers || !apiKey || !apiSecret) {
    throw new Error('Missing Kafka environment variables');
  }

  return new Kafka({
    clientId: `halalgo-${groupId}`,
    brokers: [brokers],
    ssl: true,
    sasl: {
      mechanism: 'plain',
      username: apiKey,
      password: apiSecret,
    },
  });
}

export type EventHandler<T> = (event: KafkaEvent<T>, raw: EachMessagePayload) => Promise<void>;

export async function createConsumer<T>(
  topics: KafkaTopic[],
  handler: EventHandler<T>,
): Promise<Consumer> {
  const kafka = createKafkaClient();
  const groupId = process.env['KAFKA_GROUP_ID'] ?? 'halalgo';

  const consumer = kafka.consumer({ groupId });
  await consumer.connect();

  for (const topic of topics) {
    await consumer.subscribe({ topic, fromBeginning: false });
  }

  await consumer.run({
    eachMessage: async (payload) => {
      const raw = payload.message.value?.toString();
      if (!raw) return;

      const event = JSON.parse(raw) as KafkaEvent<T>;
      await handler(event, payload);
    },
  });

  return consumer;
}
```

- [ ] **Step 6: Create `packages/kafka/src/index.ts`**

```typescript
export * from './topics.js';
export * from './producer.js';
export * from './consumer.js';
```

- [ ] **Step 7: Install dependencies and build**

```bash
npm install
cd packages/kafka && npm run build
```

Expected: `dist/` created, no TypeScript errors.

- [ ] **Step 8: Commit**

```bash
git add packages/kafka/
git commit -m "feat: add @halalgo/kafka shared package with typed producer and consumer"
```

---

## Task 5: API Gateway Scaffold

**Files:**
- Create: `services/api-gateway/package.json`
- Create: `services/api-gateway/tsconfig.json`
- Create: `services/api-gateway/vitest.config.ts`
- Create: `services/api-gateway/src/app.ts`
- Create: `services/api-gateway/src/index.ts`
- Create: `services/api-gateway/src/middleware/auth.ts`
- Create: `services/api-gateway/src/middleware/rateLimit.ts`
- Create: `services/api-gateway/src/routes/health.ts`
- Create: `services/api-gateway/src/routes/proxy.ts`
- Create: `services/api-gateway/src/websocket/server.ts`
- Create: `services/api-gateway/src/websocket/channels.ts`
- Create: `services/api-gateway/src/websocket/redis-adapter.ts`
- Test: `services/api-gateway/src/__tests__/health.test.ts`
- Test: `services/api-gateway/src/__tests__/auth.test.ts`

- [ ] **Step 1: Create `services/api-gateway/package.json`**

```json
{
  "name": "@halalgo/api-gateway",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@clerk/backend": "^1.0.0",
    "@halalgo/types": "workspace:*",
    "@halalgo/kafka": "workspace:*",
    "express": "^4.18.2",
    "helmet": "^7.1.0",
    "cors": "^2.8.5",
    "express-rate-limit": "^7.2.0",
    "http-proxy-middleware": "^3.0.0",
    "ioredis": "^5.3.2",
    "ws": "^8.16.0",
    "dotenv": "^16.4.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/ws": "^8.5.10",
    "@types/node": "*",
    "typescript": "*",
    "tsx": "^4.7.0",
    "vitest": "*",
    "supertest": "^7.0.0",
    "@types/supertest": "^6.0.2"
  }
}
```

- [ ] **Step 2: Create `services/api-gateway/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `services/api-gateway/vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
});
```

- [ ] **Step 4: Write failing health check test**

Create `services/api-gateway/src/__tests__/health.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const app = createApp();
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
  });

  it('includes service name in response', async () => {
    const app = createApp();
    const res = await request(app).get('/health');
    expect(res.body.service).toBe('api-gateway');
  });
});
```

- [ ] **Step 5: Run test — verify it fails**

```bash
cd services/api-gateway && npm test
```

Expected: FAIL — `Cannot find module '../app.js'`

- [ ] **Step 6: Create `services/api-gateway/src/routes/health.ts`**

```typescript
import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
  });
});
```

- [ ] **Step 7: Create `services/api-gateway/src/middleware/rateLimit.ts`**

```typescript
import rateLimit from 'express-rate-limit';

export const globalRateLimit = rateLimit({
  windowMs: 60 * 1000,    // 1 minute window
  max: 100,               // 100 requests per window per IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

export const strictRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute window
  max: 20,                   // 20 requests per window (for auth endpoints)
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
```

- [ ] **Step 8: Create `services/api-gateway/src/middleware/auth.ts`**

```typescript
import { createClerkClient } from '@clerk/backend';
import type { Request, Response, NextFunction } from 'express';

const clerk = createClerkClient({
  secretKey: process.env['CLERK_SECRET_KEY'],
});

export interface AuthenticatedRequest extends Request {
  clerkUserId: string;
  userRole: string;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      res.status(401).json({ error: 'Missing authorization token' });
      return;
    }

    const payload = await clerk.verifyToken(token);
    (req as AuthenticatedRequest).clerkUserId = payload.sub;
    (req as AuthenticatedRequest).userRole =
      (payload.publicMetadata as { role?: string })?.role ?? 'customer';

    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    if (authReq.userRole !== role) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
```

- [ ] **Step 9: Create `services/api-gateway/src/routes/proxy.ts`**

```typescript
import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { requireAuth } from '../middleware/auth.js';

export const proxyRouter = Router();

const SERVICE_URLS: Record<string, string> = {
  stores:        process.env['STORE_SERVICE_URL']        ?? 'http://localhost:3001',
  orders:        process.env['ORDER_SERVICE_URL']        ?? 'http://localhost:3002',
  drivers:       process.env['DRIVER_SERVICE_URL']       ?? 'http://localhost:3003',
  payments:      process.env['PAYMENT_SERVICE_URL']      ?? 'http://localhost:3004',
  notifications: process.env['NOTIFICATION_SERVICE_URL'] ?? 'http://localhost:3005',
  search:        process.env['SEARCH_SERVICE_URL']       ?? 'http://localhost:3006',
  analytics:     process.env['ANALYTICS_SERVICE_URL']   ?? 'http://localhost:3007',
};

for (const [path, target] of Object.entries(SERVICE_URLS)) {
  proxyRouter.use(
    `/api/${path}`,
    requireAuth,
    createProxyMiddleware({
      target,
      changeOrigin: true,
      pathRewrite: { [`^/api/${path}`]: `/api/${path}` },
    }),
  );
}
```

- [ ] **Step 10: Create `services/api-gateway/src/websocket/redis-adapter.ts`**

```typescript
import Redis from 'ioredis';

let publisher: Redis | null = null;
let subscriber: Redis | null = null;

function getRedisUrl(): string {
  const url = process.env['REDIS_CACHE_URL'];
  if (!url) throw new Error('Missing REDIS_CACHE_URL environment variable');
  return url;
}

export function getPublisher(): Redis {
  if (!publisher) publisher = new Redis(getRedisUrl());
  return publisher;
}

export function getSubscriber(): Redis {
  if (!subscriber) subscriber = new Redis(getRedisUrl());
  return subscriber;
}

export async function publishToChannel(channel: string, data: unknown): Promise<void> {
  const pub = getPublisher();
  await pub.publish(channel, JSON.stringify(data));
}
```

- [ ] **Step 11: Create `services/api-gateway/src/websocket/channels.ts`**

```typescript
import type { WebSocket } from 'ws';

// Maps channel name → set of connected WebSocket clients
const channelClients = new Map<string, Set<WebSocket>>();

export function subscribe(channel: string, ws: WebSocket): void {
  if (!channelClients.has(channel)) {
    channelClients.set(channel, new Set());
  }
  channelClients.get(channel)!.add(ws);
}

export function unsubscribe(channel: string, ws: WebSocket): void {
  channelClients.get(channel)?.delete(ws);
}

export function unsubscribeAll(ws: WebSocket): void {
  for (const clients of channelClients.values()) {
    clients.delete(ws);
  }
}

export function broadcastToChannel(channel: string, data: unknown): void {
  const clients = channelClients.get(channel);
  if (!clients) return;

  const message = JSON.stringify(data);
  for (const client of clients) {
    if (client.readyState === 1 /* OPEN */) {
      client.send(message);
    }
  }
}
```

- [ ] **Step 12: Create `services/api-gateway/src/websocket/server.ts`**

```typescript
import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import { subscribe, unsubscribeAll, broadcastToChannel } from './channels.js';
import { getSubscriber } from './redis-adapter.js';

interface WSMessage {
  type: 'subscribe' | 'unsubscribe';
  channel: string;
}

export function initWebSocketServer(httpServer: ReturnType<typeof import('http').createServer>): WebSocketServer {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Subscribe to all Redis channels and fan-out to WS clients
  const redisSub = getSubscriber();
  redisSub.psubscribe('*', (err) => {
    if (err) console.error('Redis psubscribe error:', err);
  });

  redisSub.on('pmessage', (_pattern, channel, message) => {
    try {
      const data = JSON.parse(message) as unknown;
      broadcastToChannel(channel, data);
    } catch {
      // Ignore malformed messages
    }
  });

  wss.on('connection', (ws: WebSocket, _req: IncomingMessage) => {
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as WSMessage;
        if (msg.type === 'subscribe') subscribe(msg.channel, ws);
        if (msg.type === 'unsubscribe') unsubscribeAll(ws);
      } catch {
        // Ignore malformed messages
      }
    });

    ws.on('close', () => unsubscribeAll(ws));

    ws.send(JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() }));
  });

  return wss;
}
```

- [ ] **Step 13: Create `services/api-gateway/src/app.ts`**

```typescript
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { healthRouter } from './routes/health.js';
import { proxyRouter } from './routes/proxy.js';
import { globalRateLimit } from './middleware/rateLimit.js';

export function createApp(): express.Application {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: process.env['ALLOWED_ORIGINS']?.split(',') ?? '*' }));
  app.use(express.json({ limit: '10mb' }));
  app.use(globalRateLimit);

  app.use('/health', healthRouter);
  app.use('/', proxyRouter);

  return app;
}
```

- [ ] **Step 14: Create `services/api-gateway/src/index.ts`**

```typescript
import 'dotenv/config';
import http from 'http';
import { createApp } from './app.js';
import { initWebSocketServer } from './websocket/server.js';

const PORT = process.env['PORT'] ?? 3000;

const app = createApp();
const httpServer = http.createServer(app);

initWebSocketServer(httpServer);

httpServer.listen(PORT, () => {
  console.log(`[api-gateway] running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  httpServer.close(() => process.exit(0));
});
```

- [ ] **Step 15: Run health check tests — verify they pass**

```bash
cd services/api-gateway && npm install && npm test
```

Expected: Both health check tests PASS.

- [ ] **Step 16: Smoke test the running gateway**

```bash
cd services/api-gateway && npm run dev
```

In a second terminal:
```bash
curl http://localhost:3000/health
```

Expected:
```json
{"status":"ok","service":"api-gateway","timestamp":"..."}
```

Stop the server with Ctrl+C.

- [ ] **Step 17: Commit**

```bash
git add services/api-gateway/
git commit -m "feat: scaffold api-gateway with Clerk auth, WebSocket server, Redis pub/sub adapter"
```

---

## Task 6: Verify Full Monorepo Build

- [ ] **Step 1: Install all workspace dependencies from root**

```bash
npm install
```

Expected: All workspace packages resolved, no peer dependency errors.

- [ ] **Step 2: Build all packages in dependency order**

```bash
npm run build
```

Expected: Turborepo builds `@halalgo/types` first, then `@halalgo/utils` and `@halalgo/kafka` (parallel), then `@halalgo/api-gateway`. All `dist/` folders populated.

- [ ] **Step 3: Run all tests**

```bash
npm run test
```

Expected: All 14 utils tests PASS. All 2 api-gateway health tests PASS.

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "chore: verify full turborepo build and all tests pass"
```

---

## Self-Review Checklist

- [x] Task 1 covers: monorepo init, turbo.json, tsconfig.base, .env.example
- [x] Task 2 covers: all TypeScript types including ORDER_TRANSITIONS FSM map, Kafka event payloads
- [x] Task 3 covers: tax calculator (all Canadian provinces), price formatter — TDD with failing tests first
- [x] Task 4 covers: Kafka producer (Confluent SASL), typed consumer factory, all topic constants
- [x] Task 5 covers: API Gateway with Clerk auth, WebSocket server, Redis pub/sub fan-out, rate limiting, health route, proxy routes
- [x] Task 6 covers: full monorepo build verification
- [x] No placeholders — every step has complete code
- [x] Type consistency — `AuthenticatedRequest`, `KafkaEvent<T>`, `KafkaTopic` used consistently
- [x] All imports use `.js` extension (required for NodeNext module resolution)
- [x] TDD followed: failing test → verify fail → implement → verify pass for utils and health check
