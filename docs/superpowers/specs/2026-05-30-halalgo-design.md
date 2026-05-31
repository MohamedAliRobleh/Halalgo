# HalalGo — Full Product Design Spec
**Date:** 2026-05-30  
**Status:** Approved  
**Product:** Premium halal food & grocery delivery platform for Canada  
**Target:** App Store + Google Play launch

---

## 1. Vision

HalalGo is Canada's first platform dedicated exclusively to halal-certified food and grocery delivery. Four distinct interfaces: Customer, Restaurant/Store, Driver, Admin. Built on a full microservices architecture mirroring Uber Eats' engineering patterns.

---

## 2. Monorepo Structure (Turborepo)

```
halalgo/
├── apps/
│   ├── customer/              # Expo SDK 50 — Customer app (food + groceries)
│   ├── restaurant/            # Expo SDK 50 — Restaurant/Store owner app
│   ├── driver/                # Expo SDK 50 — Driver app
│   └── admin/                 # React + Vite — Admin web panel
├── services/
│   ├── api-gateway/           # Entry point, routing, Clerk auth, WebSocket server
│   ├── store-service/         # Stores, menus, hours, modifiers, delivery zones
│   ├── order-service/         # Order FSM, state machine, order history
│   ├── driver-service/        # Dispatch algorithm, GPS tracking, availability
│   ├── payment-service/       # Stripe Payment Intents + Connect payouts + refunds
│   ├── notification-service/  # Expo push notifications, Kafka consumer
│   ├── search-service/        # Elasticsearch — store + menu item search
│   └── analytics-service/     # Admin dashboard data, CQRS read models
├── packages/
│   ├── types/                 # @halalgo/types — shared TypeScript interfaces
│   ├── kafka/                 # @halalgo/kafka — shared Kafka producer/consumer
│   ├── ui/                    # @halalgo/ui — shared premium React Native components
│   └── utils/                 # @halalgo/utils — shared helpers (price, date, etc.)
├── turbo.json
└── package.json
```

---

## 3. Infrastructure Stack

| Layer | Service | Notes |
|---|---|---|
| Database | Neon PostgreSQL | Separate schema per service |
| ORM | Drizzle ORM | Type-safe, auto migrations |
| Event streaming | Confluent Cloud (Kafka) | Fully managed |
| Search | Elastic Cloud (Elasticsearch) | Stores + menu items |
| Cache / Queues | Upstash Redis | 5 separate Redis databases |
| File storage | Cloudflare R2 | S3-compatible, zero egress fees |
| Auth | Clerk | JWT verified at api-gateway |
| Real-time | Raw `ws` + Redis pub/sub | Horizontally scalable |
| Payments | Stripe | Payment Intents + Connect Express |
| Maps | Google Maps API | Geocoding, directions, ETA |
| Push notifications | Expo Push Notifications API | Via notification-service |
| Backend hosting | Railway | One service per microservice |
| Admin hosting | Vercel | Static React + Vite deploy |
| Geospatial | PostGIS on Neon | ST_Distance, ST_Within queries |

---

## 4. Microservices

### 4.1 API Gateway
- Single entry point for all client requests
- Routes requests to appropriate downstream service
- Verifies Clerk JWT on every request
- Hosts WebSocket server (`ws` + Redis pub/sub adapter)
- Rate limiting (per IP + per user via Redis DB 1)
- WebSocket channels:

| Channel | Subscribers | Payload |
|---|---|---|
| `order:{id}` | Customer, Driver, Store | Status changes, ETA |
| `driver:{id}` | Customer (tracking screen) | GPS position every 5s |
| `store:{id}` | Restaurant app | New orders, cancellations |
| `driver_jobs` | Driver app | New job offers with 30s timer |

### 4.2 Store Service
- CRUD for stores (restaurants + grocery stores)
- Menu categories, items, modifier groups, modifiers
- Store hours per day of week
- Delivery zones (PostGIS polygons)
- Halal certificate management
- `store_type`: `restaurant` | `grocery`

### 4.3 Order Service
- Formal state machine — only valid transitions allowed:
  ```
  PENDING → CONFIRMED → PREPARING → READY → PICKED_UP → DELIVERED
                                            ↘ CANCELLED (≤ 2 min after placement)
  ```
- Every transition logged to `order_status_history`
- Every transition emits `order.status.updated` Kafka event
- ETA recalculated on `driver.location.updated` events
- Surge pricing applied via `surge_pricing_events` table

### 4.4 Driver Service
- Online/offline availability toggle
- GPS location updates → Redis DB 0 (TTL 30s) + Kafka `driver.location.updated`
- Dispatch algorithm:
  1. On order confirmed → PostGIS query for online drivers within 5km
  2. Offer to closest driver → 30s countdown
  3. Declined/timeout → offer to next closest
  4. All attempts logged to `driver_dispatch_log`
- Driver earnings calculation (delivery fee + tip − 20% commission)

### 4.5 Payment Service
- Stripe Payment Intents (customer → platform)
- Stripe Connect Express (driver payouts — weekly)
- Stripe Connect (restaurant payouts — on delivery confirmed)
- Commission: 20% platform fee on every order subtotal
- Webhooks: `payment_intent.succeeded`, `transfer.created`, `account.updated`
- Refunds via Stripe API, logged to `refunds` table
- Consumes `order.completed` + `order.cancelled` Kafka events

### 4.6 Notification Service
- Consumes all Kafka events
- Routes to correct push token(s) per user via Expo Push API
- Stores notification record in `notifications` table
- Manages `push_tokens` (one user, multiple devices)

### 4.7 Search Service
- Elasticsearch indices:
  - `stores`: name, description, cuisine_type, location, rating, is_open, store_type, halal certified
  - `menu_items`: name, description, price, store_id, allergens
- Synced from Kafka events (`store.status.changed`, etc.)
- Supports: full-text, geo-distance filter, cuisine filter, open-now filter, halal-only filter

### 4.8 Analytics Service
- Consumes all Kafka events (CQRS read model)
- Maintains materialized views in `analytics_schema`:
  - Revenue per day/week/month
  - Orders per hour
  - Top stores by revenue
  - Top menu items
  - Driver performance
  - Customer lifetime value
- Powers admin dashboard — no load on transactional databases

---

## 5. Database Schema (Neon + Drizzle + PostGIS)

### store_schema
```sql
stores (id, clerk_user_id, name, description, logo_url, cover_url,
  address, city, province, postal_code,
  location geometry(Point,4326),
  store_type restaurant|grocery, cuisine_type,
  halal_certificate_url, is_verified, is_open, rating,
  delivery_fee, min_order, delivery_time_min, stripe_account_id,
  created_at, updated_at)

store_hours (id, store_id, day_of_week 0-6, open_time, close_time, is_closed)

menu_categories (id, store_id, name, description, image_url, position, is_active)

menu_items (id, category_id, store_id, name, description, base_price,
  image_url, is_available, is_featured, prep_time_min, allergens, calories)

modifier_groups (id, menu_item_id, name, is_required,
  min_selections, max_selections, position)

modifiers (id, group_id, name, price_delta, is_available, position)

grocery_categories (id, name, icon, position)
  -- Global taxonomy for browse UI (Meat & Poultry, Dairy, Produce, Pantry, etc.)
  -- Grocery store products use menu_items + menu_categories (store-specific),
  -- grocery_categories is a separate global browse layer linked via menu_categories.grocery_category_id

delivery_zones (id, store_id, zone_polygon geometry(Polygon,4326),
  delivery_fee, min_order)

surge_pricing_events (id, zone_polygon geometry(Polygon,4326),
  multiplier, starts_at, ends_at, reason, is_active)
```

### customer_schema
```sql
customer_profiles (id, clerk_user_id, stripe_customer_id,
  loyalty_points, total_orders)

loyalty_transactions (id, clerk_user_id, order_id, points_delta,
  balance_after, type earned|redeemed|expired, created_at)

addresses (id, clerk_user_id, label, street, city, province,
  postal_code, location geometry(Point,4326), is_default)

customer_favorites (id, clerk_user_id, store_id, created_at)
```

### order_schema
```sql
orders (id, clerk_customer_id, store_id, driver_id,
  status pending|confirmed|preparing|ready|picked_up|delivered|cancelled,
  delivery_address jsonb, subtotal, delivery_fee, taxes, tip,
  discount, total, stripe_payment_intent_id,
  estimated_delivery_at, delivered_at, special_instructions,
  promo_code_used, delivery_photo_url, created_at, updated_at)

order_items (id, order_id, menu_item_id, quantity, unit_price,
  selected_modifiers jsonb, special_requests)

order_status_history (id, order_id, status, changed_at, changed_by_role)

order_cancellations (id, order_id, cancelled_by_role, reason, cancelled_at)
```

### driver_schema
```sql
driver_profiles (id, clerk_user_id, vehicle_type, license_plate,
  drivers_license_url, insurance_url, is_available, is_verified,
  location geometry(Point,4326), rating, total_deliveries, stripe_account_id)

driver_dispatch_log (id, order_id, driver_id, offered_at,
  response accepted|declined|timeout, declined_reason)

driver_earnings (id, driver_id, order_id, delivery_fee_earned,
  tip_earned, platform_commission, net_payout, paid_at)
```

### payment_schema
```sql
transactions (id, order_id, stripe_payment_intent_id, amount,
  status, platform_fee, store_payout, driver_payout, created_at)

refunds (id, order_id, transaction_id, amount, reason,
  stripe_refund_id, initiated_by_role, created_at)

promotions (id, store_id, code, type percentage|fixed|free_delivery,
  value, min_order, max_uses, uses_count, expires_at, is_active)
```

### notif_schema
```sql
notifications (id, clerk_user_id, title, body, data jsonb,
  is_read, created_at)

push_tokens (id, clerk_user_id, token, platform ios|android,
  created_at, last_seen_at)
```

---

## 6. Kafka Event Topics

| Topic | Producers | Consumers |
|---|---|---|
| `order.created` | order-service | notification-service, analytics-service |
| `order.status.updated` | order-service | notification-service, analytics-service |
| `order.completed` | order-service | payment-service, analytics-service |
| `order.cancelled` | order-service | payment-service, notification-service |
| `driver.location.updated` | driver-service | order-service (ETA), api-gateway (WebSocket) |
| `driver.availability.changed` | driver-service | analytics-service |
| `payment.completed` | payment-service | order-service, notification-service |
| `payment.refunded` | payment-service | notification-service, analytics-service |
| `store.status.changed` | store-service | search-service, analytics-service |
| `review.created` | order-service | store-service (rating recalc), analytics-service |
| `notification.send` | any service | notification-service (fan-out) |

---

## 7. Redis Databases (Upstash)

| DB | Key pattern | Purpose | TTL |
|---|---|---|---|
| 0 | `driver:{id}` | Live GPS positions | 30s |
| 1 | `rate:{ip}:{route}` | Rate limiting | 60s window |
| 2 | `clerk:{token_hash}` | JWT verification cache | 5min |
| 3 | BullMQ queues | Async jobs (push, payouts) | — |
| 4 | `store:{id}`, `menu:{storeId}` | Store + menu cache | 5min |

---

## 8. Mobile Apps

### Shared stack
- Expo SDK 50
- Expo Router v3 (file-based routing)
- NativeWind (Tailwind for React Native)
- Clerk Expo SDK
- Zustand (local/UI state)
- React Query (server state + cache)
- Reanimated 2 (all animations)
- Expo Location, Expo Notifications, Expo Camera, Expo Image Picker
- React Native Maps (Google Maps)

### 8.1 Customer App

**Navigation:**
```
(auth)/   → welcome, sign-in, sign-up, verify
(tabs)/   → Home, Groceries, Orders, Favorites, Profile
(stack)/  → store/[id], item/[id], cart, checkout, order/[id], search, addresses
```

**Key screens:**
- **Home** — delivery address header, search bar, promo carousel, Open Now, cuisine categories, Featured, Near You (PostGIS), Popular in Ottawa
- **Groceries** — same layout, filtered to `store_type=grocery`, grocery category chips
- **Store page** — cover + floating logo, info modal (hours/cert), menu by category tabs, item cards with +/− buttons, floating cart bar
- **Item detail** — photo, modifiers (required + optional groups), quantity, Add to Cart
- **Cart** — items list, promo code, special instructions, delivery address, subtotal breakdown
- **Checkout** — Stripe Payment Sheet, tip selector (15/18/20/custom), HST 13% Ontario, Place Order
- **Order tracking** — animated status stepper, live Google Maps with driver pin (WebSocket), live ETA, driver contact, Cancel button (2min window)

### 8.2 Restaurant App

**Navigation:**
```
(auth)/ → sign-in
(tabs)/ → Dashboard, Orders, Menu, Profile
```

**Key screens:**
- **Dashboard** — Recharts revenue graph, orders today, avg rating, top items, prominent ON/OFF toggle
- **Orders** — New/Active/Completed tabs, fullscreen new order modal (sound + haptic + Accept/Reject), prep timer, Mark as Ready button
- **Menu** — categories + items list, toggle availability, full CRUD with R2 image upload
- **Profile** — store info, store hours per day, halal cert upload, Stripe Connect onboarding

### 8.3 Driver App

**Navigation:**
```
(auth)/ → sign-in + document upload
(tabs)/ → Home, Active Delivery, Earnings, Profile
```

**Key screens:**
- **Home** — Online/Offline toggle, animated waiting state, incoming job modal (store→customer details, distance, estimated pay, 30s timer)
- **Active** — step-by-step: navigate to store → confirm pickup → navigate to customer → photo confirmation → complete delivery
- **Earnings** — day/week/month breakdown, delivery history, Stripe payout status

### 8.4 Admin Panel (React + Vite)

**Pages:** Dashboard (live KPIs + Recharts), Users, Orders, Stores (halal verification), Drivers (document validation + live map with React Leaflet), Promotions, Finances, Push Notifications broadcast

---

## 9. Design System

### Colors
```
Primary:        #1B4332  (deep islamic green)
Secondary:      #40916C  (mint green)
Accent:         #F4A261  (warm halal orange)
Background:     #FAFAFA
Dark BG:        #0D1B12
Success:        #2D6A4F
Error:          #E63946
Text Primary:   #1A1A2E
Text Secondary: #6B7280
```

### Typography
- Headings: Poppins Bold
- Body: Inter Regular / Medium
- Prices: Roboto Mono

### UI Standards
- Border radius: 16px on cards
- Shadows: soft (`elevation: 4`, `shadowOpacity: 0.08`)
- All animations: Reanimated 2
- Skeleton loaders: on every data fetch
- Haptic feedback: add to cart, order placed, status changes, accept/reject
- Dark mode: NativeWind `dark:` classes throughout

### Shared UI Package (`@halalgo/ui`)
- `StoreCard` — logo, name, rating, delivery time, Halal badge
- `MenuItemCard` — photo, name, price, add button
- `OrderStatusStepper` — animated status steps
- `SkeletonLoader` — configurable placeholder
- `HalalBadge` — certified green checkmark
- `SurgeIndicator` — orange flame when surge active

---

## 10. Auth Flow (Clerk)

- Customer/Restaurant/Driver: Clerk Expo SDK (sign-up, sign-in, OTP, Google OAuth)
- Admin: Clerk React SDK
- API Gateway: verifies Clerk JWT on every request, caches result in Redis DB 2 (5min TTL)
- Role stored as Clerk `publicMetadata.role`: `customer` | `restaurant` | `driver` | `admin`
- No `users` table — Clerk owns identity. All tables reference `clerk_user_id`

---

## 11. Payment Flow

1. Customer places order → order-service creates order in `PENDING`
2. payment-service creates Stripe Payment Intent
3. Customer completes Stripe Payment Sheet in app
4. Stripe webhook `payment_intent.succeeded` → payment-service → emits `payment.completed`
5. order-service consumes `payment.completed` → transitions to `CONFIRMED`
6. On `DELIVERED`: payment-service transfers 80% to restaurant Stripe Connect account
7. Driver earnings accumulated in `driver_earnings`, paid out weekly via Stripe Connect

**Commission:** 20% platform fee on every order subtotal.  
**Taxes:** Calculated server-side by order-service based on delivery address province — HST 13% (ON, NB, NL, NS, PEI), GST+PST elsewhere (BC: 5%+7%, AB: 5%, QC: 5%+9.975%).

---

## 12. Premium Features

- **Halal Certification** — badge on all verified stores, filter in search, admin verification workflow
- **Smart ETA** — Google Maps Directions API + driver GPS + prep time, recalculated live
- **Loyalty Program** — 1 point per $1 spent, 100 pts = $5 off, full audit trail in `loyalty_transactions`
- **Surge Pricing** — multiplier on delivery fee during peak demand, transparent to customer with flame icon
- **Bilingual FR/EN** — i18n in all 3 mobile apps, auto-detected from device locale, toggle in settings
- **Groceries** — integrated as tab in Customer app, same order/payment/delivery system
- **Modifier System** — full required/optional modifier groups on all menu items

---

## 13. Security

- Clerk JWT verification on every API Gateway request
- Role-based access enforced at gateway before routing to services
- Zod input validation on all service endpoints
- Rate limiting per IP + per user (Redis DB 1)
- Helmet.js security headers
- HTTPS enforced (Railway + Vercel enforce by default)
- All secrets in environment variables (never committed)
- Cloudflare R2 signed URLs for private file access (certificates, driver documents)

---

## 14. Environment Variables

```env
# Neon
DATABASE_URL=

# Clerk
CLERK_SECRET_KEY=
CLERK_PUBLISHABLE_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=

# Confluent Cloud Kafka
KAFKA_BOOTSTRAP_SERVERS=
KAFKA_API_KEY=
KAFKA_API_SECRET=

# Elastic Cloud
ELASTICSEARCH_URL=
ELASTICSEARCH_API_KEY=

# Upstash Redis (one per DB)
REDIS_DRIVER_LOCATION_URL=
REDIS_RATE_LIMIT_URL=
REDIS_JWT_CACHE_URL=
REDIS_QUEUE_URL=
REDIS_CACHE_URL=

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Google Maps
GOOGLE_MAPS_API_KEY=

# Expo
EXPO_ACCESS_TOKEN=

# App
PORT=3000
NODE_ENV=development
```

---

## 15. Dev Commands

```bash
# Root (Turborepo)
npm install          # install all workspaces
npm run dev          # start all services in parallel
npm run build        # build all apps + services
npm run db:migrate   # run Drizzle migrations on Neon

# Mobile apps
npx expo start --filter=customer
npx expo start --filter=restaurant
npx expo start --filter=driver

# Individual services
npm run dev --filter=api-gateway
npm run dev --filter=order-service
```
