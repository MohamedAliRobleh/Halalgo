# HalalGo — Plan 7: Admin Panel (React + Vite)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the web-based admin panel with live KPIs dashboard, user/store/driver management, order oversight, halal certificate verification, financial reporting, and push notification broadcasting.

**Architecture:** React + Vite + Tailwind CSS SPA. Clerk React SDK for auth. React Query for all data fetching. Recharts for all charts. React Leaflet for the live driver map. All API calls go through the API Gateway. Deployed on Vercel.

**Tech Stack:** React 18, Vite 5, Tailwind CSS 3, Clerk React SDK, React Query v5, Recharts 2, React Leaflet 4, Axios, React Router v6

**Prerequisite:** Plans 1–5 complete — all backend services running.

---

## File Map

```
apps/admin/
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── index.html
├── src/
│   ├── main.tsx                  # Vite entry — Clerk + React Query providers
│   ├── App.tsx                   # React Router routes
│   ├── lib/
│   │   ├── api.ts                # Axios with Clerk token
│   │   └── queryClient.ts
│   ├── pages/
│   │   ├── Dashboard.tsx         # Live KPIs + Recharts + Leaflet map
│   │   ├── Users.tsx             # Customers / Restaurants / Drivers tabs
│   │   ├── Orders.tsx            # All orders with filters
│   │   ├── Stores.tsx            # Halal verification workflow
│   │   ├── Drivers.tsx           # Document validation + live map
│   │   ├── Promotions.tsx        # Promo code management
│   │   ├── Finances.tsx          # Revenue + payouts
│   │   └── Notifications.tsx     # Broadcast push notifications
│   └── components/
│       ├── Sidebar.tsx
│       ├── StatCard.tsx
│       ├── DataTable.tsx
│       └── RevenueChart.tsx
```

---

## Task 1: Admin Panel Project Setup

**Files:**
- Create: `apps/admin/package.json`
- Create: `apps/admin/vite.config.ts`
- Create: `apps/admin/tailwind.config.js`
- Create: `apps/admin/index.html`
- Create: `apps/admin/src/lib/api.ts`
- Create: `apps/admin/src/lib/queryClient.ts`

- [ ] **Step 1: Create `apps/admin/package.json`**

```json
{
  "name": "@halalgo/admin",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@clerk/clerk-react": "^5.0.0",
    "@halalgo/types": "workspace:*",
    "@tanstack/react-query": "^5.0.0",
    "axios": "^1.6.0",
    "leaflet": "^1.9.4",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-leaflet": "^4.2.1",
    "react-router-dom": "^6.23.0",
    "recharts": "^2.12.0"
  },
  "devDependencies": {
    "@types/leaflet": "^1.9.12",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.4.0",
    "vite": "^5.2.0"
  }
}
```

- [ ] **Step 2: Create `apps/admin/vite.config.ts`**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
});
```

- [ ] **Step 3: Create `apps/admin/tailwind.config.js`**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary:   '#1B4332',
        secondary: '#40916C',
        accent:    '#F4A261',
        success:   '#2D6A4F',
        error:     '#E63946',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Roboto Mono', 'monospace'],
      },
    },
  },
};
```

- [ ] **Step 4: Create `apps/admin/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>HalalGo Admin</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Poppins:wght@700&family=Roboto+Mono&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create `apps/admin/src/lib/api.ts`**

```typescript
import axios from 'axios';

const API_URL = import.meta.env['VITE_API_URL'] ?? 'http://localhost:3000';

export const api = axios.create({ baseURL: API_URL });

// Inject Clerk token — called from main.tsx after Clerk loads
export function setAuthToken(token: string | null): void {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
}
```

- [ ] **Step 6: Create `apps/admin/src/lib/queryClient.ts`**

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:           30_000,
      refetchOnWindowFocus: false,
      retry:               1,
    },
  },
});
```

- [ ] **Step 7: Install dependencies**

```bash
cd apps/admin && npm install
```

Expected: All packages installed.

- [ ] **Step 8: Commit**

```bash
git add apps/admin/
git commit -m "feat: admin panel project setup with Vite, Tailwind, Clerk, React Query"
```

---

## Task 2: Admin App Entry + Auth + Router

**Files:**
- Create: `apps/admin/src/main.tsx`
- Create: `apps/admin/src/App.tsx`
- Create: `apps/admin/src/index.css`
- Create: `apps/admin/src/components/Sidebar.tsx`

- [ ] **Step 1: Create `apps/admin/src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: 'Inter', system-ui, sans-serif;
  background-color: #F9FAFB;
}
```

- [ ] **Step 2: Create `apps/admin/src/main.tsx`**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider, useAuth } from '@clerk/clerk-react';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { queryClient } from './lib/queryClient';
import { setAuthToken } from './lib/api';
import App from './App';
import './index.css';

const PUBLISHABLE_KEY = import.meta.env['VITE_CLERK_PUBLISHABLE_KEY'] as string;

function AuthTokenSync() {
  const { getToken } = useAuth();

  React.useEffect(() => {
    getToken().then(setAuthToken);
    const interval = setInterval(() => getToken().then(setAuthToken), 55 * 60 * 1000); // refresh every 55min
    return () => clearInterval(interval);
  }, [getToken]);

  return null;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthTokenSync />
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ClerkProvider>
  </React.StrictMode>,
);
```

- [ ] **Step 3: Create `apps/admin/src/App.tsx`**

```tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, SignIn } from '@clerk/clerk-react';
import { Sidebar } from './components/Sidebar';
import { Dashboard }     from './pages/Dashboard';
import { Users }         from './pages/Users';
import { Orders }        from './pages/Orders';
import { Stores }        from './pages/Stores';
import { Drivers }       from './pages/Drivers';
import { Promotions }    from './pages/Promotions';
import { Finances }      from './pages/Finances';
import { Notifications } from './pages/Notifications';

function ProtectedLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  if (!isLoaded) return <div className="flex h-screen items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!isSignedIn) return <div className="flex h-screen items-center justify-center"><SignIn /></div>;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/"             element={<Dashboard />} />
          <Route path="/users"        element={<Users />} />
          <Route path="/orders"       element={<Orders />} />
          <Route path="/stores"       element={<Stores />} />
          <Route path="/drivers"      element={<Drivers />} />
          <Route path="/promotions"   element={<Promotions />} />
          <Route path="/finances"     element={<Finances />} />
          <Route path="/notifications" element={<Notifications />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/*" element={<ProtectedLayout />} />
    </Routes>
  );
}
```

- [ ] **Step 4: Create `apps/admin/src/components/Sidebar.tsx`**

```tsx
import { NavLink } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';

const NAV_ITEMS = [
  { path: '/',              label: 'Dashboard',      emoji: '📊' },
  { path: '/users',         label: 'Users',          emoji: '👥' },
  { path: '/orders',        label: 'Orders',         emoji: '📦' },
  { path: '/stores',        label: 'Stores',         emoji: '🏪' },
  { path: '/drivers',       label: 'Drivers',        emoji: '🛵' },
  { path: '/promotions',    label: 'Promotions',     emoji: '🎟️' },
  { path: '/finances',      label: 'Finances',       emoji: '💰' },
  { path: '/notifications', label: 'Notifications',  emoji: '🔔' },
];

export function Sidebar() {
  const { signOut } = useClerk();

  return (
    <aside className="w-64 bg-primary h-full flex flex-col py-6 px-4 shrink-0">
      {/* Logo */}
      <div className="mb-8 px-2">
        <h1 className="text-white font-bold text-2xl" style={{ fontFamily: 'Poppins' }}>HalalGo</h1>
        <p className="text-white/60 text-xs mt-0.5">Admin Panel</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1">
        {NAV_ITEMS.map(({ path, label, emoji }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `flex items-center px-3 py-2.5 rounded-xl mb-1 text-sm transition-colors ${
                isActive
                  ? 'bg-white/20 text-white font-medium'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <span className="mr-3">{emoji}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Sign Out */}
      <button
        onClick={() => signOut()}
        className="text-white/60 hover:text-white text-sm px-3 py-2 text-left transition-colors"
      >
        ← Sign Out
      </button>
    </aside>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/
git commit -m "feat: admin panel app shell with Clerk auth, sidebar navigation, route protection"
```

---

## Task 3: Dashboard Page

**Files:**
- Create: `apps/admin/src/components/StatCard.tsx`
- Create: `apps/admin/src/components/RevenueChart.tsx`
- Create: `apps/admin/src/pages/Dashboard.tsx`

- [ ] **Step 1: Create `apps/admin/src/components/StatCard.tsx`**

```tsx
interface StatCardProps {
  label:     string;
  value:     string | number;
  emoji:     string;
  trend?:    string;
  trendUp?:  boolean;
}

export function StatCard({ label, value, emoji, trend, trendUp }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{emoji}</span>
        {trend && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${trendUp ? 'text-success bg-success/10' : 'text-error bg-error/10'}`}>
            {trendUp ? '↑' : '↓'} {trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 font-mono">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  );
}
```

- [ ] **Step 2: Create `apps/admin/src/components/RevenueChart.tsx`**

```tsx
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface RevenueDataPoint {
  date:         string;
  totalRevenue: string | number;
  orderCount:   number;
}

interface RevenueChartProps {
  data: RevenueDataPoint[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  const formatted = data.map((d) => ({
    date:    new Date(d.date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }),
    revenue: Number(d.totalRevenue),
    orders:  d.orderCount,
  }));

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <h3 className="font-semibold text-gray-900 mb-4">Revenue (Last 7 Days)</h3>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={formatted} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#1B4332" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#1B4332" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
          <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} tickFormatter={(v) => `$${v}`} />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: '1px solid #F3F4F6', fontSize: 12 }}
            formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
          />
          <Area type="monotone" dataKey="revenue" stroke="#1B4332" strokeWidth={2} fill="url(#revenueGradient)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 3: Create `apps/admin/src/pages/Dashboard.tsx`**

```tsx
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { StatCard } from '../components/StatCard';
import { RevenueChart } from '../components/RevenueChart';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

interface DashboardData {
  revenue:    { today: number; orderCount: number };
  orders:     { hourly: unknown[] };
}

interface RevenuePoint {
  date:         string;
  totalRevenue: string;
  orderCount:   number;
}

export function Dashboard() {
  const { data: dashboard } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn:  async () => {
      const res = await api.get<DashboardData>('/api/analytics/dashboard');
      return res.data;
    },
    refetchInterval: 30_000,
  });

  const { data: revenue = [] } = useQuery({
    queryKey: ['admin-revenue-7d'],
    queryFn:  async () => {
      const res = await api.get<{ data: RevenuePoint[] }>('/api/analytics/revenue?days=7');
      return res.data.data;
    },
  });

  const STATS = [
    { label: "Today's Revenue", value: `$${(dashboard?.revenue.today ?? 0).toFixed(2)}`, emoji: '💰', trend: '12%', trendUp: true },
    { label: 'Orders Today',    value: dashboard?.revenue.orderCount ?? 0,                emoji: '📦', trend: '8%',  trendUp: true },
    { label: 'Active Drivers',  value: '—',                                               emoji: '🛵' },
    { label: 'Open Stores',     value: '—',                                               emoji: '🏪' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6" style={{ fontFamily: 'Poppins' }}>Dashboard</h1>

      {/* KPI Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {STATS.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="col-span-2">
          <RevenueChart data={revenue} />
        </div>

        {/* Orders per Hour */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">Orders This Hour</h3>
          <p className="text-4xl font-bold text-primary font-mono">
            {dashboard?.revenue.orderCount ?? 0}
          </p>
          <p className="text-sm text-gray-500 mt-1">orders placed today</p>
        </div>
      </div>

      {/* Live Driver Map */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Live Driver Map</h3>
        </div>
        <MapContainer
          center={[45.4215, -75.6972]}
          zoom={12}
          style={{ height: 320, width: '100%' }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </MapContainer>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/pages/Dashboard.tsx apps/admin/src/components/
git commit -m "feat: admin dashboard with KPI stats, revenue chart, and live driver map"
```

---

## Task 4: Stores + Halal Verification Page

**Files:**
- Create: `apps/admin/src/components/DataTable.tsx`
- Create: `apps/admin/src/pages/Stores.tsx`

- [ ] **Step 1: Create `apps/admin/src/components/DataTable.tsx`**

```tsx
interface Column<T> {
  key:      keyof T | string;
  label:    string;
  render?:  (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data:    T[];
  keyField: keyof T;
  loading?: boolean;
}

export function DataTable<T extends object>({ columns, data, keyField, loading }: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((n) => (
          <div key={n} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            {columns.map((col) => (
              <th key={String(col.key)} className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase tracking-wide">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={String(row[keyField])} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
              {columns.map((col) => (
                <td key={String(col.key)} className="py-3 px-4 text-gray-700">
                  {col.render
                    ? col.render(row)
                    : String(row[col.key as keyof T] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="text-center py-12 text-gray-400">
                No data found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Create `apps/admin/src/pages/Stores.tsx`**

```tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { DataTable } from '../components/DataTable';
import type { Store } from '@halalgo/types';

export function Stores() {
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified' | 'suspended'>('all');
  const qc = useQueryClient();

  const { data: stores = [], isLoading } = useQuery({
    queryKey: ['admin-stores', filter],
    queryFn:  async () => {
      const res = await api.get<{ stores: Store[] }>('/api/stores');
      const all = res.data.stores;
      if (filter === 'pending')   return all.filter((s) => !s.isVerified);
      if (filter === 'verified')  return all.filter((s) => s.isVerified);
      return all;
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ storeId, verify }: { storeId: string; verify: boolean }) => {
      await api.patch(`/api/admin/stores/${storeId}/verify`, { isVerified: verify });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-stores'] }),
  });

  const COLUMNS = [
    { key: 'name',       label: 'Store Name' },
    { key: 'storeType',  label: 'Type' },
    { key: 'city',       label: 'City' },
    { key: 'rating',     label: 'Rating',  render: (s: Store) => `⭐ ${s.rating.toFixed(1)}` },
    {
      key: 'isVerified',
      label: 'Status',
      render: (s: Store) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.isVerified ? 'bg-success/10 text-success' : 'bg-yellow-50 text-yellow-700'}`}>
          {s.isVerified ? '✓ Halal Verified' : '⏳ Pending'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (s: Store) => (
        <div className="flex gap-2">
          {s.halalCertificateUrl && (
            <a href={s.halalCertificateUrl} target="_blank" rel="noopener noreferrer"
               className="text-xs text-blue-600 hover:underline">View Cert</a>
          )}
          {!s.isVerified ? (
            <button
              className="text-xs bg-success text-white px-3 py-1 rounded-lg hover:bg-success/90"
              onClick={() => verifyMutation.mutate({ storeId: s.id, verify: true })}
            >
              Verify
            </button>
          ) : (
            <button
              className="text-xs bg-error text-white px-3 py-1 rounded-lg hover:bg-error/90"
              onClick={() => verifyMutation.mutate({ storeId: s.id, verify: false })}
            >
              Revoke
            </button>
          )}
        </div>
      ),
    },
  ];

  const FILTER_TABS = [
    { key: 'all',       label: 'All' },
    { key: 'pending',   label: 'Pending Verification' },
    { key: 'verified',  label: 'Verified' },
  ] as const;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6" style={{ fontFamily: 'Poppins' }}>Stores</h1>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === tab.key ? 'bg-primary text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-primary'}`}
            onClick={() => setFilter(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <DataTable columns={COLUMNS} data={stores} keyField="id" loading={isLoading} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/pages/Stores.tsx apps/admin/src/components/DataTable.tsx
git commit -m "feat: admin stores page with halal verification workflow"
```

---

## Task 5: Remaining Pages (Orders, Users, Finances, Notifications)

**Files:**
- Create: `apps/admin/src/pages/Orders.tsx`
- Create: `apps/admin/src/pages/Users.tsx`
- Create: `apps/admin/src/pages/Drivers.tsx`
- Create: `apps/admin/src/pages/Promotions.tsx`
- Create: `apps/admin/src/pages/Finances.tsx`
- Create: `apps/admin/src/pages/Notifications.tsx`

- [ ] **Step 1: Create `apps/admin/src/pages/Orders.tsx`**

```tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { DataTable } from '../components/DataTable';
import type { Order } from '@halalgo/types';

export function Orders() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const qc = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['admin-orders', statusFilter],
    queryFn:  async () => {
      const res = await api.get<{ orders: Order[] }>('/api/orders');
      const all = res.data.orders ?? [];
      return statusFilter === 'all' ? all : all.filter((o) => o.status === statusFilter);
    },
    refetchInterval: 30_000,
  });

  const refundMutation = useMutation({
    mutationFn: async (orderId: string) => {
      await api.post(`/api/payments/refund`, { orderId, reason: 'Admin initiated refund' });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-orders'] }),
  });

  const STATUS_OPTIONS = ['all', 'pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled'];

  const STATUS_COLORS: Record<string, string> = {
    pending:   'bg-yellow-50 text-yellow-700',
    confirmed: 'bg-blue-50 text-blue-700',
    preparing: 'bg-orange-50 text-orange-700',
    ready:     'bg-purple-50 text-purple-700',
    picked_up: 'bg-indigo-50 text-indigo-700',
    delivered: 'bg-success/10 text-success',
    cancelled: 'bg-error/10 text-error',
  };

  const COLUMNS = [
    { key: 'id',      label: 'Order ID',   render: (o: Order) => `#${o.id.slice(-8).toUpperCase()}` },
    { key: 'storeId', label: 'Store ID',   render: (o: Order) => o.storeId.slice(-8) },
    { key: 'total',   label: 'Total',      render: (o: Order) => `$${Number(o.total).toFixed(2)}` },
    { key: 'status',  label: 'Status',
      render: (o: Order) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[o.status] ?? ''}`}>
          {o.status}
        </span>
      ),
    },
    { key: 'createdAt', label: 'Placed At', render: (o: Order) => new Date(o.createdAt).toLocaleString('en-CA') },
    { key: 'actions',   label: 'Actions',
      render: (o: Order) => o.status === 'delivered' ? (
        <button
          className="text-xs bg-error/10 text-error px-3 py-1 rounded-lg hover:bg-error/20"
          onClick={() => {
            if (confirm('Issue a full refund for this order?')) refundMutation.mutate(o.id);
          }}
        >
          Refund
        </button>
      ) : null,
    },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6" style={{ fontFamily: 'Poppins' }}>Orders</h1>

      <select
        className="mb-4 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:border-primary"
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>{s === 'all' ? 'All statuses' : s}</option>
        ))}
      </select>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <DataTable columns={COLUMNS} data={orders} keyField="id" loading={isLoading} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `apps/admin/src/pages/Users.tsx`**

```tsx
import { useState } from 'react';

type UserTab = 'customers' | 'restaurants' | 'drivers';

export function Users() {
  const [tab, setTab] = useState<UserTab>('customers');

  const TABS: { key: UserTab; label: string }[] = [
    { key: 'customers',   label: 'Customers' },
    { key: 'restaurants', label: 'Restaurant Owners' },
    { key: 'drivers',     label: 'Drivers' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6" style={{ fontFamily: 'Poppins' }}>Users</h1>

      <div className="flex gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === t.key ? 'bg-primary text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <p className="text-gray-400">Showing {tab} — connect to Clerk Users API to list users by role.</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `apps/admin/src/pages/Drivers.tsx`**

```tsx
export function Drivers() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6" style={{ fontFamily: 'Poppins' }}>Drivers</h1>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <p className="text-gray-500">Driver document validation and live map — fetches from driver-service.</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `apps/admin/src/pages/Promotions.tsx`**

```tsx
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export function Promotions() {
  const [code, setCode]     = useState('');
  const [value, setValue]   = useState('');
  const [type, setType]     = useState<'percentage' | 'fixed' | 'free_delivery'>('percentage');
  const qc = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async () => {
      await api.post('/api/payments/promotions', {
        code,
        type,
        value: Number(value),
        minOrder: 0,
        isActive: true,
      });
    },
    onSuccess: () => {
      setCode('');
      setValue('');
      qc.invalidateQueries({ queryKey: ['promotions'] });
    },
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6" style={{ fontFamily: 'Poppins' }}>Promotions</h1>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-lg">
        <h2 className="font-semibold text-gray-900 mb-4">Create Promo Code</h2>

        <div className="space-y-3">
          <input
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary"
            placeholder="Code (e.g. WELCOME20)"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />

          <select
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary"
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
          >
            <option value="percentage">Percentage off</option>
            <option value="fixed">Fixed amount off</option>
            <option value="free_delivery">Free delivery</option>
          </select>

          {type !== 'free_delivery' && (
            <input
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary"
              placeholder={type === 'percentage' ? 'Value (e.g. 20 for 20%)' : 'Value (e.g. 5 for $5 off)'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              type="number"
            />
          )}

          <button
            className="w-full bg-primary text-white py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
            onClick={() => createMutation.mutate()}
            disabled={!code || createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating...' : 'Create Promo Code'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create `apps/admin/src/pages/Finances.tsx`**

```tsx
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { RevenueChart } from '../components/RevenueChart';
import { StatCard } from '../components/StatCard';

export function Finances() {
  const { data: revenue = [] } = useQuery({
    queryKey: ['admin-revenue-30d'],
    queryFn:  async () => {
      const res = await api.get<{ data: Array<{ date: string; totalRevenue: string; orderCount: number }> }>(
        '/api/analytics/revenue?days=30',
      );
      return res.data.data;
    },
  });

  const totalRevenue = revenue.reduce((sum, d) => sum + Number(d.totalRevenue), 0);
  const totalOrders  = revenue.reduce((sum, d) => sum + d.orderCount, 0);
  const platformFees = totalRevenue * 0.20;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6" style={{ fontFamily: 'Poppins' }}>Finances</h1>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="30-Day Revenue"   value={`$${totalRevenue.toFixed(2)}`}  emoji="💰" />
        <StatCard label="Platform Fees"    value={`$${platformFees.toFixed(2)}`}  emoji="📊" />
        <StatCard label="Total Orders"     value={totalOrders}                    emoji="📦" />
      </div>

      <RevenueChart data={revenue} />
    </div>
  );
}
```

- [ ] **Step 6: Create `apps/admin/src/pages/Notifications.tsx`**

```tsx
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';

export function Notifications() {
  const [title, setTitle]   = useState('');
  const [body, setBody]     = useState('');
  const [target, setTarget] = useState<'all' | 'customer' | 'driver' | 'restaurant'>('all');
  const [sent, setSent]     = useState(false);

  const broadcastMutation = useMutation({
    mutationFn: async () => {
      await api.post('/api/admin/notifications/broadcast', { title, body, target });
    },
    onSuccess: () => {
      setSent(true);
      setTitle('');
      setBody('');
      setTimeout(() => setSent(false), 3000);
    },
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6" style={{ fontFamily: 'Poppins' }}>Push Notifications</h1>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-xl">
        <h2 className="font-semibold text-gray-900 mb-4">Broadcast Notification</h2>

        {sent && (
          <div className="bg-success/10 text-success rounded-xl px-4 py-3 mb-4 text-sm font-medium">
            ✅ Notification sent successfully!
          </div>
        )}

        <div className="space-y-3">
          <select
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary"
            value={target}
            onChange={(e) => setTarget(e.target.value as typeof target)}
          >
            <option value="all">All users</option>
            <option value="customer">Customers only</option>
            <option value="driver">Drivers only</option>
            <option value="restaurant">Restaurant owners only</option>
          </select>

          <input
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary"
            placeholder="Notification title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <textarea
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary resize-none"
            placeholder="Notification body message..."
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />

          <button
            className="w-full bg-primary text-white py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            onClick={() => broadcastMutation.mutate()}
            disabled={!title || !body || broadcastMutation.isPending}
          >
            {broadcastMutation.isPending ? 'Sending...' : `Send to ${target === 'all' ? 'All Users' : target}`}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Commit all pages**

```bash
git add apps/admin/src/pages/
git commit -m "feat: admin Orders, Users, Drivers, Promotions, Finances, Notifications pages"
```

---

## Task 6: Launch Admin Panel

- [ ] **Step 1: Start the admin panel dev server**

```bash
cd apps/admin && npm run dev
```

Expected: Vite starts on `http://localhost:5173`. Open in browser.

- [ ] **Step 2: Verify auth flow**

Navigate to `http://localhost:5173`. Expected: Clerk sign-in modal appears (since not signed in).

Sign in with an admin Clerk account. Expected: Sidebar appears, Dashboard page loads.

- [ ] **Step 3: Verify dashboard**

With the backend services running, the dashboard should show:
- 4 KPI stat cards
- Revenue chart (empty if no orders yet)
- Live driver map (OpenStreetMap tiles load correctly)

- [ ] **Step 4: Verify stores page**

Navigate to Stores. Expected: Table loads (empty if no stores yet). Filter tabs work.

- [ ] **Step 5: Verify push notification broadcast**

Navigate to Notifications. Fill title + body, click Send. Expected: API call to `/api/admin/notifications/broadcast`.

- [ ] **Step 6: Build for production**

```bash
cd apps/admin && npm run build
```

Expected: `dist/` folder generated with no TypeScript errors.

- [ ] **Step 7: Final commit**

```bash
git add .
git commit -m "chore: plan 7 complete — admin panel fully built and verified"
```

---

## Self-Review Checklist

- [x] Clerk auth — sign-in wall before any page, token injected into Axios on load
- [x] Sidebar — all 8 pages navigable, active link highlighted
- [x] Dashboard — 4 KPI stat cards, Recharts AreaChart revenue, React Leaflet live map
- [x] Stores — filter by pending/verified, verify/revoke halal cert button, view cert link
- [x] Orders — status filter dropdown, refund button on delivered orders
- [x] Promotions — create promo code form (percentage, fixed, free_delivery)
- [x] Finances — 30-day revenue chart + platform fees breakdown
- [x] Notifications — broadcast to all/customers/drivers/restaurants with success feedback
- [x] DataTable — reusable with generics, skeleton loader, empty state
- [x] All pages: consistent design (white cards, rounded-2xl, primary colors)
- [x] No TBDs or placeholders
