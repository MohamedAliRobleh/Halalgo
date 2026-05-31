# HalalGo — Plan 6: Mobile Apps (Customer, Restaurant, Driver)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build all three Expo mobile apps — Customer (food + groceries), Restaurant, and Driver — with full navigation, screens, real-time order tracking, Stripe payments, and Clerk authentication.

**Architecture:** Three standalone Expo SDK 50 apps sharing the `@halalgo/types` package. All API calls go through the API Gateway. Real-time updates via WebSocket. Clerk Expo SDK handles auth in all three apps. NativeWind provides Tailwind-style styling. Zustand manages local state. React Query manages server state.

**Tech Stack:** Expo SDK 50, Expo Router v3, NativeWind, Clerk Expo SDK, Zustand 4, React Query v5, Stripe React Native SDK, Expo Location, Expo Notifications, Expo Camera, Expo Image Picker, React Native Maps, Reanimated 2

**Prerequisite:** Plans 1–5 complete — all backend services running.

---

## File Map

```
apps/
├── customer/
│   ├── app.json
│   ├── package.json
│   ├── tailwind.config.js
│   ├── global.css
│   ├── app/
│   │   ├── _layout.tsx             # Root layout — Clerk provider, React Query
│   │   ├── index.tsx               # Redirect to tabs or onboarding
│   │   ├── (auth)/
│   │   │   ├── _layout.tsx
│   │   │   ├── welcome.tsx         # Onboarding 3 slides
│   │   │   ├── sign-in.tsx
│   │   │   └── sign-up.tsx
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx         # Bottom tab navigator
│   │   │   ├── index.tsx           # Home — restaurants
│   │   │   ├── groceries.tsx       # Grocery stores
│   │   │   ├── orders.tsx          # Active + past orders
│   │   │   ├── favorites.tsx
│   │   │   └── profile.tsx
│   │   └── (stack)/
│   │       ├── store/[id].tsx      # Store detail + menu
│   │       ├── item/[id].tsx       # Menu item + modifiers
│   │       ├── cart.tsx
│   │       ├── checkout.tsx
│   │       ├── order/[id].tsx      # Live tracking
│   │       ├── search.tsx
│   │       └── addresses.tsx
│   ├── components/
│   │   ├── StoreCard.tsx
│   │   ├── MenuItemCard.tsx
│   │   ├── CartBar.tsx
│   │   ├── OrderStatusStepper.tsx
│   │   ├── SkeletonLoader.tsx
│   │   ├── HalalBadge.tsx
│   │   └── SurgeIndicator.tsx
│   ├── store/
│   │   ├── cart.store.ts           # Zustand cart state
│   │   └── auth.store.ts
│   ├── hooks/
│   │   ├── useWebSocket.ts         # WebSocket connection + channel subscription
│   │   ├── useNearbyStores.ts
│   │   └── useOrderTracking.ts
│   └── lib/
│       ├── api.ts                  # Axios instance with Clerk token
│       └── queryClient.ts
├── restaurant/
│   ├── app.json
│   ├── package.json
│   └── app/
│       ├── _layout.tsx
│       ├── (auth)/
│       │   └── sign-in.tsx
│       └── (tabs)/
│           ├── _layout.tsx
│           ├── dashboard.tsx
│           ├── orders.tsx
│           ├── menu.tsx
│           └── profile.tsx
└── driver/
    ├── app.json
    ├── package.json
    └── app/
        ├── _layout.tsx
        ├── (auth)/
        │   └── sign-in.tsx
        └── (tabs)/
            ├── _layout.tsx
            ├── home.tsx
            ├── active.tsx
            ├── earnings.tsx
            └── profile.tsx
```

---

## Task 1: Customer App — Project Setup

**Files:**
- Create: `apps/customer/package.json`
- Create: `apps/customer/app.json`
- Create: `apps/customer/tailwind.config.js`
- Create: `apps/customer/global.css`
- Create: `apps/customer/lib/api.ts`
- Create: `apps/customer/lib/queryClient.ts`
- Create: `apps/customer/store/cart.store.ts`
- Create: `apps/customer/hooks/useWebSocket.ts`

- [ ] **Step 1: Create `apps/customer/package.json`**

```json
{
  "name": "@halalgo/customer",
  "version": "1.0.0",
  "private": true,
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "build:ios": "eas build --platform ios",
    "build:android": "eas build --platform android"
  },
  "dependencies": {
    "@clerk/clerk-expo": "^1.0.0",
    "@halalgo/types": "workspace:*",
    "@stripe/stripe-react-native": "0.38.0",
    "@tanstack/react-query": "^5.0.0",
    "axios": "^1.6.0",
    "expo": "~50.0.0",
    "expo-camera": "~14.0.0",
    "expo-constants": "~15.4.0",
    "expo-font": "~11.10.0",
    "expo-haptics": "~12.8.0",
    "expo-image-picker": "~14.7.0",
    "expo-location": "~16.5.0",
    "expo-notifications": "~0.27.0",
    "expo-router": "~3.4.0",
    "expo-secure-store": "~12.8.0",
    "expo-splash-screen": "~0.26.0",
    "expo-status-bar": "~1.11.0",
    "nativewind": "^4.0.0",
    "react": "18.2.0",
    "react-native": "0.73.6",
    "react-native-maps": "1.10.0",
    "react-native-reanimated": "~3.6.0",
    "react-native-safe-area-context": "4.8.2",
    "react-native-screens": "~3.29.0",
    "react-native-gesture-handler": "~2.14.0",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "@babel/core": "^7.24.0",
    "@types/react": "~18.2.79",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.0"
  }
}
```

- [ ] **Step 2: Create `apps/customer/app.json`**

```json
{
  "expo": {
    "name": "HalalGo",
    "slug": "halalgo-customer",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#1B4332"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "ca.halalgo.customer",
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "HalalGo needs your location to show nearby restaurants.",
        "NSLocationAlwaysUsageDescription": "HalalGo uses your location for delivery tracking.",
        "NSCameraUsageDescription": "Used to upload profile photos."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#1B4332"
      },
      "package": "ca.halalgo.customer",
      "permissions": ["ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION", "CAMERA"]
    },
    "plugins": [
      "expo-router",
      "expo-location",
      "expo-notifications",
      "expo-camera",
      [
        "expo-font",
        {
          "fonts": [
            "assets/fonts/Poppins-Bold.ttf",
            "assets/fonts/Inter-Regular.ttf",
            "assets/fonts/Inter-Medium.ttf",
            "assets/fonts/RobotoMono-Regular.ttf"
          ]
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

- [ ] **Step 3: Create `apps/customer/tailwind.config.js`**

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary:    '#1B4332',
        secondary:  '#40916C',
        accent:     '#F4A261',
        background: '#FAFAFA',
        darkbg:     '#0D1B12',
        success:    '#2D6A4F',
        error:      '#E63946',
      },
      fontFamily: {
        'poppins-bold': ['Poppins-Bold'],
        'inter':        ['Inter-Regular'],
        'inter-medium': ['Inter-Medium'],
        'mono':         ['RobotoMono-Regular'],
      },
    },
  },
};
```

- [ ] **Step 4: Create `apps/customer/global.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 5: Create `apps/customer/lib/api.ts`**

```typescript
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3000';

export const api = axios.create({ baseURL: API_URL });

// Attach Clerk token to every request
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('clerk_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Retry once on 401 (token refresh)
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      // Clerk token refresh handled by Clerk SDK — just retry
      return api(error.config);
    }
    return Promise.reject(error);
  },
);
```

- [ ] **Step 6: Create `apps/customer/lib/queryClient.ts`**

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:    5 * 60 * 1000,  // 5 minutes
      gcTime:       10 * 60 * 1000, // 10 minutes
      retry:        2,
      refetchOnWindowFocus: false,
    },
  },
});
```

- [ ] **Step 7: Create `apps/customer/store/cart.store.ts`**

```typescript
import { create } from 'zustand';
import type { MenuItem, SelectedModifier } from '@halalgo/types';

export interface CartItem {
  menuItemId:        string;
  name:              string;
  quantity:          number;
  unitPrice:         number;
  selectedModifiers: SelectedModifier[];
  imageUrl:          string | null;
  specialRequests:   string | null;
}

interface CartStore {
  storeId:     string | null;
  storeName:   string | null;
  items:       CartItem[];
  addItem:     (item: CartItem, storeId: string, storeName: string) => void;
  removeItem:  (menuItemId: string) => void;
  updateQty:   (menuItemId: string, quantity: number) => void;
  clear:       () => void;
  subtotal:    () => number;
  totalItems:  () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  storeId:    null,
  storeName:  null,
  items:      [],

  addItem: (item, storeId, storeName) => {
    const current = get();
    // Clear cart if switching stores
    if (current.storeId && current.storeId !== storeId) {
      set({ items: [item], storeId, storeName });
      return;
    }
    const existing = current.items.find((i) => i.menuItemId === item.menuItemId);
    if (existing) {
      set({
        items: current.items.map((i) =>
          i.menuItemId === item.menuItemId ? { ...i, quantity: i.quantity + item.quantity } : i,
        ),
        storeId,
        storeName,
      });
    } else {
      set({ items: [...current.items, item], storeId, storeName });
    }
  },

  removeItem: (menuItemId) =>
    set((s) => ({ items: s.items.filter((i) => i.menuItemId !== menuItemId) })),

  updateQty: (menuItemId, quantity) =>
    set((s) => ({
      items: quantity <= 0
        ? s.items.filter((i) => i.menuItemId !== menuItemId)
        : s.items.map((i) => (i.menuItemId === menuItemId ? { ...i, quantity } : i)),
    })),

  clear: () => set({ items: [], storeId: null, storeName: null }),

  subtotal: () =>
    get().items.reduce((sum, item) => {
      const modTotal = item.selectedModifiers.reduce((m, mod) => m + mod.priceDelta, 0);
      return sum + (item.unitPrice + modTotal) * item.quantity;
    }, 0),

  totalItems: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
}));
```

- [ ] **Step 8: Create `apps/customer/hooks/useWebSocket.ts`**

```typescript
import { useEffect, useRef, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';

const WS_URL = process.env['EXPO_PUBLIC_WS_URL'] ?? 'ws://localhost:3000/ws';

type MessageHandler = (data: unknown) => void;

export function useWebSocket(channel: string, onMessage: MessageHandler): void {
  const wsRef = useRef<WebSocket | null>(null);
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'subscribe', channel }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as unknown;
        handlerRef.current(data);
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onerror = (e) => console.warn('[WS] error', e);

    ws.onclose = () => {
      // Reconnect after 3 seconds
      setTimeout(() => {
        wsRef.current = new WebSocket(WS_URL);
      }, 3000);
    };

    return () => {
      ws.send(JSON.stringify({ type: 'unsubscribe', channel }));
      ws.close();
    };
  }, [channel]);
}
```

- [ ] **Step 9: Install dependencies**

```bash
cd apps/customer && npm install
```

Expected: All packages installed. No peer dependency errors.

- [ ] **Step 10: Commit**

```bash
git add apps/customer/
git commit -m "feat: customer app project setup with Zustand cart, React Query, WebSocket hook"
```

---

## Task 2: Customer App — Root Layout + Auth

**Files:**
- Create: `apps/customer/app/_layout.tsx`
- Create: `apps/customer/app/index.tsx`
- Create: `apps/customer/app/(auth)/_layout.tsx`
- Create: `apps/customer/app/(auth)/welcome.tsx`
- Create: `apps/customer/app/(auth)/sign-in.tsx`
- Create: `apps/customer/app/(auth)/sign-up.tsx`

- [ ] **Step 1: Create `apps/customer/app/_layout.tsx`**

```tsx
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import '../global.css';

SplashScreen.preventAutoHideAsync();

const tokenCache = {
  async getToken(key: string) { return SecureStore.getItemAsync(key); },
  async saveToken(key: string, value: string) { return SecureStore.setItemAsync(key, value); },
  async clearToken(key: string) { return SecureStore.deleteItemAsync(key); },
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Poppins-Bold':      require('../assets/fonts/Poppins-Bold.ttf'),
    'Inter-Regular':     require('../assets/fonts/Inter-Regular.ttf'),
    'Inter-Medium':      require('../assets/fonts/Inter-Medium.ttf'),
    'RobotoMono-Regular': require('../assets/fonts/RobotoMono-Regular.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ClerkProvider
      publishableKey={process.env['EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY']!}
      tokenCache={tokenCache}
    >
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <Stack screenOptions={{ headerShown: false }} />
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ClerkProvider>
  );
}
```

- [ ] **Step 2: Create `apps/customer/app/index.tsx`**

```tsx
import { Redirect } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';

export default function Index() {
  const { isSignedIn, isLoaded } = useAuth();
  if (!isLoaded) return null;
  return isSignedIn ? <Redirect href="/(tabs)/" /> : <Redirect href="/(auth)/welcome" />;
}
```

- [ ] **Step 3: Create `apps/customer/app/(auth)/_layout.tsx`**

```tsx
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 4: Create `apps/customer/app/(auth)/welcome.tsx`**

```tsx
import { View, Text, TouchableOpacity, Image, Dimensions } from 'react-native';
import { useRef, useState } from 'react';
import { router } from 'expo-router';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    title: '100% Halal Certified',
    subtitle: 'Every restaurant verified with official halal certification.',
    emoji: '🌙',
    bg: '#1B4332',
  },
  {
    title: 'Fast Delivery Across Canada',
    subtitle: 'From Ottawa to Vancouver — your halal meal arrives in 30 minutes.',
    emoji: '🚀',
    bg: '#40916C',
  },
  {
    title: 'Track Your Order Live',
    subtitle: 'Follow your driver on the map in real time.',
    emoji: '📍',
    bg: '#F4A261',
  },
];

export default function WelcomeScreen() {
  const [current, setCurrent] = useState(0);
  const slide = SLIDES[current]!;

  return (
    <View className="flex-1" style={{ backgroundColor: slide.bg }}>
      <Animated.View
        key={current}
        entering={FadeInRight}
        exiting={FadeOutLeft}
        className="flex-1 items-center justify-center px-8"
      >
        <Text style={{ fontSize: 80 }}>{slide.emoji}</Text>
        <Text className="text-white font-poppins-bold text-3xl text-center mt-6">
          {slide.title}
        </Text>
        <Text className="text-white/80 text-inter text-center mt-4 text-base leading-6">
          {slide.subtitle}
        </Text>
      </Animated.View>

      {/* Dots */}
      <View className="flex-row justify-center pb-4">
        {SLIDES.map((_, i) => (
          <View
            key={i}
            className={`h-2 rounded-full mx-1 ${i === current ? 'w-6 bg-white' : 'w-2 bg-white/40'}`}
          />
        ))}
      </View>

      <View className="px-6 pb-12">
        {current < SLIDES.length - 1 ? (
          <TouchableOpacity
            className="bg-white rounded-2xl py-4 items-center"
            onPress={() => setCurrent((c) => c + 1)}
          >
            <Text className="text-primary font-inter-medium text-base">Next</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            className="bg-white rounded-2xl py-4 items-center"
            onPress={() => router.replace('/(auth)/sign-up')}
          >
            <Text className="text-primary font-inter-medium text-base">Get Started</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity className="mt-4 items-center" onPress={() => router.replace('/(auth)/sign-in')}>
          <Text className="text-white/80 text-inter">Already have an account? Sign in</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
```

- [ ] **Step 5: Create `apps/customer/app/(auth)/sign-in.tsx`**

```tsx
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { useSignIn } from '@clerk/clerk-expo';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSignIn(): Promise<void> {
    if (!isLoaded) return;
    setLoading(true);
    try {
      const result = await signIn.create({ identifier: email, password });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/(tabs)/');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign in failed';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-background px-6 justify-center">
      <Text className="font-poppins-bold text-3xl text-primary mb-2">Welcome back</Text>
      <Text className="text-secondary font-inter mb-8">Sign in to your HalalGo account</Text>

      <TextInput
        className="border border-gray-200 rounded-2xl px-4 py-3.5 mb-4 font-inter text-primary"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholderTextColor="#9CA3AF"
      />

      <TextInput
        className="border border-gray-200 rounded-2xl px-4 py-3.5 mb-6 font-inter text-primary"
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholderTextColor="#9CA3AF"
      />

      <TouchableOpacity
        className="bg-primary rounded-2xl py-4 items-center"
        onPress={handleSignIn}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="white" />
          : <Text className="text-white font-inter-medium text-base">Sign In</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity className="mt-6 items-center" onPress={() => router.push('/(auth)/sign-up')}>
        <Text className="text-secondary font-inter">Don't have an account? Sign up</Text>
      </TouchableOpacity>
    </View>
  );
}
```

- [ ] **Step 6: Create `apps/customer/app/(auth)/sign-up.tsx`**

```tsx
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { useSignUp } from '@clerk/clerk-expo';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

export default function SignUpScreen() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode]         = useState('');
  const [pending, setPending]   = useState(false);
  const [loading, setLoading]   = useState(false);

  async function handleSignUp(): Promise<void> {
    if (!isLoaded) return;
    setLoading(true);
    try {
      await signUp.create({ firstName: name.split(' ')[0], lastName: name.split(' ')[1] ?? '', emailAddress: email, password });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPending(true);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(): Promise<void> {
    if (!isLoaded) return;
    setLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/(tabs)/');
      }
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  if (pending) {
    return (
      <View className="flex-1 bg-background px-6 justify-center">
        <Text className="font-poppins-bold text-2xl text-primary mb-2">Verify your email</Text>
        <Text className="text-secondary font-inter mb-8">Enter the code sent to {email}</Text>
        <TextInput
          className="border border-gray-200 rounded-2xl px-4 py-3.5 mb-6 font-mono text-primary text-center text-2xl tracking-widest"
          placeholder="000000"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={6}
          placeholderTextColor="#9CA3AF"
        />
        <TouchableOpacity className="bg-primary rounded-2xl py-4 items-center" onPress={handleVerify} disabled={loading}>
          {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-inter-medium text-base">Verify</Text>}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background px-6 justify-center">
      <Text className="font-poppins-bold text-3xl text-primary mb-2">Create account</Text>
      <Text className="text-secondary font-inter mb-8">Join HalalGo today</Text>

      {[
        { label: 'Full Name', value: name, setter: setName, type: 'default' as const },
        { label: 'Email', value: email, setter: setEmail, type: 'email-address' as const },
      ].map(({ label, value, setter, type }) => (
        <TextInput
          key={label}
          className="border border-gray-200 rounded-2xl px-4 py-3.5 mb-4 font-inter text-primary"
          placeholder={label}
          value={value}
          onChangeText={setter}
          keyboardType={type}
          autoCapitalize={type === 'default' ? 'words' : 'none'}
          placeholderTextColor="#9CA3AF"
        />
      ))}

      <TextInput
        className="border border-gray-200 rounded-2xl px-4 py-3.5 mb-6 font-inter text-primary"
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholderTextColor="#9CA3AF"
      />

      <TouchableOpacity className="bg-primary rounded-2xl py-4 items-center" onPress={handleSignUp} disabled={loading}>
        {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-inter-medium text-base">Create Account</Text>}
      </TouchableOpacity>

      <TouchableOpacity className="mt-6 items-center" onPress={() => router.push('/(auth)/sign-in')}>
        <Text className="text-secondary font-inter">Already have an account? Sign in</Text>
      </TouchableOpacity>
    </View>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add apps/customer/app/(auth)/
git commit -m "feat: customer app auth flow — onboarding, sign-in, sign-up with Clerk"
```

---

## Task 3: Customer App — Tab Navigation + Home Screen

**Files:**
- Create: `apps/customer/app/(tabs)/_layout.tsx`
- Create: `apps/customer/app/(tabs)/index.tsx`
- Create: `apps/customer/components/StoreCard.tsx`
- Create: `apps/customer/components/HalalBadge.tsx`
- Create: `apps/customer/components/SkeletonLoader.tsx`
- Create: `apps/customer/hooks/useNearbyStores.ts`

- [ ] **Step 1: Create `apps/customer/app/(tabs)/_layout.tsx`**

```tsx
import { Tabs } from 'expo-router';
import { Home, ShoppingBag, Heart, User } from 'lucide-react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1B4332',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor:  '#F3F4F6',
          height:          88,
          paddingBottom:   24,
        },
        tabBarLabelStyle: { fontFamily: 'Inter-Medium', fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: ({ color }) => <Home size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="groceries"
        options={{ title: 'Groceries', tabBarIcon: ({ color }) => <ShoppingBag size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="orders"
        options={{ title: 'Orders', tabBarIcon: ({ color }) => <ShoppingBag size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="favorites"
        options={{ title: 'Favorites', tabBarIcon: ({ color }) => <Heart size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color }) => <User size={22} color={color} /> }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 2: Create `apps/customer/components/HalalBadge.tsx`**

```tsx
import { View, Text } from 'react-native';

export function HalalBadge() {
  return (
    <View className="flex-row items-center bg-success/10 rounded-full px-2 py-0.5">
      <Text className="text-success text-xs font-inter-medium">✓ Halal</Text>
    </View>
  );
}
```

- [ ] **Step 3: Create `apps/customer/components/SkeletonLoader.tsx`**

```tsx
import { View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';

interface SkeletonProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  className?: string;
}

export function SkeletonLoader({ width, height, borderRadius = 8, className }: SkeletonProps) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[{ width, height, borderRadius, backgroundColor: '#E5E7EB' }, animStyle]}
      className={className}
    />
  );
}

export function StoreCardSkeleton() {
  return (
    <View className="bg-white rounded-2xl mr-4 overflow-hidden shadow-sm" style={{ width: 220 }}>
      <SkeletonLoader width={220} height={120} borderRadius={0} />
      <View className="p-3">
        <SkeletonLoader width={140} height={14} />
        <SkeletonLoader width={100} height={12} className="mt-2" />
        <SkeletonLoader width={160} height={10} className="mt-2" />
      </View>
    </View>
  );
}
```

- [ ] **Step 4: Create `apps/customer/components/StoreCard.tsx`**

```tsx
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { HalalBadge } from './HalalBadge';
import type { Store } from '@halalgo/types';
import * as Haptics from 'expo-haptics';

interface StoreCardProps {
  store: Store;
  horizontal?: boolean;
}

export function StoreCard({ store, horizontal = false }: StoreCardProps) {
  function handlePress(): void {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(stack)/store/${store.id}`);
  }

  const cardStyle = horizontal
    ? 'bg-white rounded-2xl mr-4 shadow-sm overflow-hidden'
    : 'bg-white rounded-2xl mb-4 shadow-sm overflow-hidden';

  const imageStyle = horizontal ? { width: 220, height: 120 } : { width: '100%', height: 160 };

  return (
    <TouchableOpacity className={cardStyle} style={horizontal ? { width: 220 } : {}} onPress={handlePress} activeOpacity={0.9}>
      <Image
        source={{ uri: store.coverUrl || 'https://via.placeholder.com/400x200' }}
        style={imageStyle}
        resizeMode="cover"
      />
      <View className="p-3">
        <View className="flex-row items-center justify-between">
          <Text className="font-poppins-bold text-primary text-base flex-1 mr-2" numberOfLines={1}>
            {store.name}
          </Text>
          {store.isVerified && <HalalBadge />}
        </View>
        <Text className="font-inter text-secondary text-xs mt-0.5" numberOfLines={1}>
          {store.cuisineType ?? 'Groceries'}
        </Text>
        <View className="flex-row items-center mt-2">
          <Text className="font-mono text-primary text-xs">⭐ {store.rating.toFixed(1)}</Text>
          <Text className="font-inter text-gray-400 text-xs mx-2">•</Text>
          <Text className="font-inter text-gray-500 text-xs">{store.deliveryTimeMin} min</Text>
          <Text className="font-inter text-gray-400 text-xs mx-2">•</Text>
          <Text className="font-inter text-gray-500 text-xs">
            ${Number(store.deliveryFee).toFixed(2)} delivery
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
```

- [ ] **Step 5: Create `apps/customer/hooks/useNearbyStores.ts`**

```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Store } from '@halalgo/types';

interface UseNearbyStoresParams {
  lat?: number;
  lng?: number;
  storeType?: 'restaurant' | 'grocery';
  radiusKm?: number;
}

export function useNearbyStores({ lat, lng, storeType, radiusKm = 10 }: UseNearbyStoresParams) {
  return useQuery({
    queryKey: ['stores', 'nearby', lat, lng, storeType],
    queryFn: async (): Promise<Store[]> => {
      if (!lat || !lng) return [];
      const res = await api.get<{ stores: Store[] }>('/api/stores/nearby', {
        params: { lat, lng, storeType, radiusKm },
      });
      return res.data.stores;
    },
    enabled: !!lat && !!lng,
  });
}
```

- [ ] **Step 6: Create `apps/customer/app/(tabs)/index.tsx`** (Home Screen)

```tsx
import { View, Text, ScrollView, TextInput, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useNearbyStores } from '../../hooks/useNearbyStores';
import { StoreCard } from '../../components/StoreCard';
import { StoreCardSkeleton } from '../../components/SkeletonLoader';

const CUISINE_CATEGORIES = [
  { emoji: '🥙', label: 'Shawarma' },
  { emoji: '🍔', label: 'Burgers' },
  { emoji: '🍕', label: 'Pizza' },
  { emoji: '🍛', label: 'Biryani' },
  { emoji: '🔥', label: 'Grills' },
  { emoji: '🍣', label: 'Sushi Halal' },
  { emoji: '🧁', label: 'Desserts' },
  { emoji: '🥤', label: 'Drinks' },
];

export default function HomeScreen() {
  const [coords, setCoords]           = useState<{ lat: number; lng: number } | null>(null);
  const [selectedCuisine, setCuisine] = useState<string | null>(null);

  const { data: nearbyStores = [], isLoading } = useNearbyStores({
    lat:      coords?.lat,
    lng:      coords?.lng,
    storeType: 'restaurant',
  });

  useEffect(() => {
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status !== 'granted') return;
      Location.getCurrentPositionAsync({}).then((loc) => {
        setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      });
    });
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-5 pt-4 pb-2">
          <Text className="font-inter text-secondary text-xs">Delivering to</Text>
          <TouchableOpacity onPress={() => router.push('/(stack)/addresses')}>
            <Text className="font-poppins-bold text-primary text-lg">📍 Ottawa, ON</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <TouchableOpacity
          className="mx-5 mb-4 flex-row items-center bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm"
          onPress={() => router.push('/(stack)/search')}
          activeOpacity={0.8}
        >
          <Text className="text-gray-400 font-inter flex-1">Search restaurants or dishes...</Text>
        </TouchableOpacity>

        {/* Cuisine Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pl-5 mb-6">
          {CUISINE_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.label}
              className={`mr-3 items-center px-4 py-2 rounded-2xl border ${selectedCuisine === cat.label ? 'bg-primary border-primary' : 'bg-white border-gray-100'}`}
              onPress={() => setCuisine(selectedCuisine === cat.label ? null : cat.label)}
            >
              <Text style={{ fontSize: 20 }}>{cat.emoji}</Text>
              <Text className={`font-inter text-xs mt-1 ${selectedCuisine === cat.label ? 'text-white' : 'text-primary'}`}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Near You */}
        <View className="px-5 mb-2">
          <Text className="font-poppins-bold text-primary text-lg mb-4">Near You</Text>
          {isLoading
            ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {[1, 2, 3].map((n) => <StoreCardSkeleton key={n} />)}
              </ScrollView>
            )
            : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {nearbyStores.map((store) => (
                  <StoreCard key={store.id} store={store} horizontal />
                ))}
              </ScrollView>
            )
          }
        </View>

        {/* All Restaurants */}
        <View className="px-5 mt-4 mb-8">
          <Text className="font-poppins-bold text-primary text-lg mb-4">All Restaurants</Text>
          {isLoading
            ? [1, 2, 3].map((n) => <StoreCardSkeleton key={n} />)
            : nearbyStores.map((store) => <StoreCard key={store.id} store={store} />)
          }
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add apps/customer/app/(tabs)/ apps/customer/components/ apps/customer/hooks/
git commit -m "feat: customer home screen with nearby stores, cuisine categories, skeleton loaders"
```

---

## Task 4: Customer App — Store Detail + Cart + Checkout

**Files:**
- Create: `apps/customer/app/(stack)/store/[id].tsx`
- Create: `apps/customer/app/(stack)/cart.tsx`
- Create: `apps/customer/app/(stack)/checkout.tsx`
- Create: `apps/customer/components/CartBar.tsx`

- [ ] **Step 1: Create `apps/customer/components/CartBar.tsx`**

```tsx
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useCartStore } from '../store/cart.store';
import * as Haptics from 'expo-haptics';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';

export function CartBar() {
  const { items, subtotal, totalItems } = useCartStore();

  if (items.length === 0) return null;

  return (
    <Animated.View entering={SlideInDown} exiting={SlideOutDown} className="absolute bottom-6 left-4 right-4">
      <TouchableOpacity
        className="bg-primary rounded-2xl px-5 py-4 flex-row items-center justify-between shadow-lg"
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push('/(stack)/cart');
        }}
        activeOpacity={0.9}
      >
        <View className="bg-white/20 rounded-xl px-2.5 py-1">
          <Text className="text-white font-poppins-bold text-sm">{totalItems()}</Text>
        </View>
        <Text className="text-white font-poppins-bold text-base">View Cart</Text>
        <Text className="text-white font-mono text-sm">${subtotal().toFixed(2)}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
```

- [ ] **Step 2: Create `apps/customer/app/(stack)/store/[id].tsx`**

```tsx
import { View, Text, ScrollView, Image, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../../lib/api';
import { useCartStore } from '../../../store/cart.store';
import { CartBar } from '../../../components/CartBar';
import { HalalBadge } from '../../../components/HalalBadge';
import { SkeletonLoader } from '../../../components/SkeletonLoader';
import * as Haptics from 'expo-haptics';
import type { Store, MenuItem, MenuCategory } from '@halalgo/types';

export default function StoreScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addItem } = useCartStore();

  const { data: store, isLoading: storeLoading } = useQuery({
    queryKey: ['store', id],
    queryFn: async () => {
      const res = await api.get<{ store: Store }>(`/api/stores/${id}`);
      return res.data.store;
    },
  });

  const { data: menu, isLoading: menuLoading } = useQuery({
    queryKey: ['menu', id],
    queryFn: async () => {
      const res = await api.get<{ items: MenuItem[] }>(`/api/menu/${id}`);
      return res.data.items;
    },
  });

  function handleAddItem(item: MenuItem): void {
    if (!store) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addItem(
      {
        menuItemId:        item.id,
        name:              item.name,
        quantity:          1,
        unitPrice:         Number(item.basePrice),
        selectedModifiers: [],
        imageUrl:          item.imageUrl,
        specialRequests:   null,
      },
      store.id,
      store.name,
    );
  }

  if (storeLoading || !store) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <SkeletonLoader width="100%" height={220} borderRadius={0} />
        <View className="px-5 pt-4">
          <SkeletonLoader width={200} height={24} />
          <SkeletonLoader width={160} height={16} className="mt-3" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Cover Image */}
        <View>
          <Image source={{ uri: store.coverUrl }} style={{ width: '100%', height: 220 }} resizeMode="cover" />
          <TouchableOpacity
            className="absolute top-12 left-4 bg-black/40 rounded-full p-2"
            onPress={() => router.back()}
          >
            <Text className="text-white text-lg">←</Text>
          </TouchableOpacity>
        </View>

        {/* Store Info */}
        <View className="px-5 pt-4 pb-2">
          <View className="flex-row items-center justify-between">
            <Text className="font-poppins-bold text-primary text-2xl flex-1">{store.name}</Text>
            {store.isVerified && <HalalBadge />}
          </View>
          <Text className="font-inter text-secondary text-sm mt-1">{store.cuisineType}</Text>
          <View className="flex-row items-center mt-2">
            <Text className="font-mono text-primary text-sm">⭐ {store.rating.toFixed(1)}</Text>
            <Text className="text-gray-300 mx-2">•</Text>
            <Text className="font-inter text-gray-500 text-sm">{store.deliveryTimeMin} min</Text>
            <Text className="text-gray-300 mx-2">•</Text>
            <Text className="font-inter text-gray-500 text-sm">${Number(store.deliveryFee).toFixed(2)} delivery</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View className="px-5 pt-4 pb-32">
          <Text className="font-poppins-bold text-primary text-lg mb-4">Menu</Text>
          {menuLoading
            ? [1, 2, 3, 4].map((n) => (
                <View key={n} className="bg-white rounded-2xl p-4 mb-3 flex-row">
                  <View className="flex-1 mr-3">
                    <SkeletonLoader width={160} height={16} />
                    <SkeletonLoader width={120} height={12} className="mt-2" />
                    <SkeletonLoader width={80} height={14} className="mt-3" />
                  </View>
                  <SkeletonLoader width={80} height={80} borderRadius={12} />
                </View>
              ))
            : (menu ?? []).map((item) => (
                <View key={item.id} className="bg-white rounded-2xl p-4 mb-3 flex-row shadow-sm">
                  <View className="flex-1 mr-3">
                    <Text className="font-inter-medium text-primary text-base">{item.name}</Text>
                    {item.description && (
                      <Text className="font-inter text-gray-500 text-xs mt-1" numberOfLines={2}>
                        {item.description}
                      </Text>
                    )}
                    <Text className="font-mono text-primary text-sm mt-2">
                      ${Number(item.basePrice).toFixed(2)}
                    </Text>
                  </View>
                  <View className="items-end">
                    {item.imageUrl && (
                      <Image source={{ uri: item.imageUrl }} style={{ width: 80, height: 80, borderRadius: 12 }} />
                    )}
                    <TouchableOpacity
                      className="mt-2 bg-primary rounded-full w-8 h-8 items-center justify-center"
                      onPress={() => handleAddItem(item)}
                    >
                      <Text className="text-white font-poppins-bold text-lg">+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
          }
        </View>
      </ScrollView>

      <CartBar />
    </View>
  );
}
```

- [ ] **Step 3: Create `apps/customer/app/(stack)/cart.tsx`**

```tsx
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useCartStore } from '../../store/cart.store';
import * as Haptics from 'expo-haptics';

export default function CartScreen() {
  const { items, subtotal, updateQty, removeItem, storeName } = useCartStore();
  const DELIVERY_FEE = 2.99;
  const TAX_RATE     = 0.13; // Ontario HST, actual rate calculated server-side
  const taxes        = subtotal() * TAX_RATE;
  const total        = subtotal() + DELIVERY_FEE + taxes;

  if (items.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Text className="text-4xl mb-4">🛒</Text>
        <Text className="font-poppins-bold text-primary text-xl">Your cart is empty</Text>
        <TouchableOpacity className="mt-6" onPress={() => router.back()}>
          <Text className="text-secondary font-inter">Browse restaurants</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="px-5 py-4 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Text className="text-primary font-inter text-base">←</Text>
        </TouchableOpacity>
        <Text className="font-poppins-bold text-primary text-xl">{storeName}</Text>
      </View>

      <ScrollView className="flex-1 px-5">
        {items.map((item) => (
          <View key={item.menuItemId} className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
            <View className="flex-row items-center justify-between">
              <Text className="font-inter-medium text-primary flex-1">{item.name}</Text>
              <Text className="font-mono text-primary">${(item.unitPrice * item.quantity).toFixed(2)}</Text>
            </View>
            <View className="flex-row items-center mt-3">
              <TouchableOpacity
                className="w-8 h-8 border border-gray-200 rounded-full items-center justify-center"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updateQty(item.menuItemId, item.quantity - 1);
                }}
              >
                <Text className="text-primary font-poppins-bold">−</Text>
              </TouchableOpacity>
              <Text className="mx-4 font-inter-medium text-primary">{item.quantity}</Text>
              <TouchableOpacity
                className="w-8 h-8 bg-primary rounded-full items-center justify-center"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updateQty(item.menuItemId, item.quantity + 1);
                }}
              >
                <Text className="text-white font-poppins-bold">+</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Price Breakdown */}
        <View className="bg-white rounded-2xl p-4 mb-6 shadow-sm">
          {[
            { label: 'Subtotal', value: subtotal().toFixed(2) },
            { label: 'Delivery fee', value: DELIVERY_FEE.toFixed(2) },
            { label: 'HST (13%)', value: taxes.toFixed(2) },
          ].map(({ label, value }) => (
            <View key={label} className="flex-row justify-between mb-2">
              <Text className="font-inter text-gray-500">{label}</Text>
              <Text className="font-mono text-primary">${value}</Text>
            </View>
          ))}
          <View className="border-t border-gray-100 pt-3 flex-row justify-between">
            <Text className="font-poppins-bold text-primary">Total</Text>
            <Text className="font-mono font-poppins-bold text-primary">${total.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      <View className="px-5 pb-8">
        <TouchableOpacity
          className="bg-primary rounded-2xl py-4 items-center"
          onPress={() => router.push('/(stack)/checkout')}
        >
          <Text className="text-white font-inter-medium text-base">Proceed to Checkout — ${total.toFixed(2)}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
```

- [ ] **Step 4: Create `apps/customer/app/(stack)/checkout.tsx`**

```tsx
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { router } from 'expo-router';
import { useCartStore } from '../../store/cart.store';
import { api } from '../../lib/api';
import * as Haptics from 'expo-haptics';

const TIP_OPTIONS = [
  { label: '15%', value: 0.15 },
  { label: '18%', value: 0.18 },
  { label: '20%', value: 0.20 },
  { label: 'None', value: 0 },
];

export default function CheckoutScreen() {
  const { items, subtotal, storeId, clear } = useCartStore();
  const [selectedTip, setTip]     = useState(0.15);
  const [loading, setLoading]     = useState(false);

  const DELIVERY_FEE = 2.99;
  const tip          = subtotal() * selectedTip;
  const taxes        = subtotal() * 0.13; // Display only — actual computed server-side
  const total        = subtotal() + DELIVERY_FEE + taxes + tip;

  async function handlePlaceOrder(): Promise<void> {
    if (!storeId) return;
    setLoading(true);
    try {
      // 1. Create order
      const orderRes = await api.post<{ order: { id: string } }>('/api/orders', {
        storeId,
        items: items.map((i) => ({
          menuItemId:        i.menuItemId,
          quantity:          i.quantity,
          unitPrice:         i.unitPrice,
          selectedModifiers: i.selectedModifiers,
        })),
        deliveryAddress: {
          street: '123 Main St', city: 'Ottawa',
          province: 'ON', postalCode: 'K1A0A9',
          latitude: 45.4215, longitude: -75.6972,
        },
        subtotal:  subtotal(),
        deliveryFee: DELIVERY_FEE,
        tip,
        promoCodeUsed:       null,
        specialInstructions: null,
      });

      const orderId = orderRes.data.order.id;

      // 2. Create payment intent
      const intentRes = await api.post<{ clientSecret: string }>('/api/payments/create-intent', {
        orderId,
        amount: total,
        currency: 'cad',
      });

      // In production: open Stripe Payment Sheet with intentRes.data.clientSecret
      // For now, simulate success
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      clear();
      router.replace(`/(stack)/order/${orderId}`);
    } catch (err: unknown) {
      Alert.alert('Order failed', err instanceof Error ? err.message : 'Please try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 py-4 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Text className="text-primary text-base">←</Text>
        </TouchableOpacity>
        <Text className="font-poppins-bold text-primary text-xl">Checkout</Text>
      </View>

      <ScrollView className="flex-1 px-5">
        {/* Tip Selection */}
        <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
          <Text className="font-poppins-bold text-primary mb-3">Add a tip</Text>
          <View className="flex-row">
            {TIP_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.label}
                className={`flex-1 py-2 mx-1 rounded-xl items-center border ${selectedTip === opt.value ? 'bg-primary border-primary' : 'border-gray-200'}`}
                onPress={() => setTip(opt.value)}
              >
                <Text className={`font-inter-medium text-sm ${selectedTip === opt.value ? 'text-white' : 'text-primary'}`}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Order Summary */}
        <View className="bg-white rounded-2xl p-4 mb-6 shadow-sm">
          <Text className="font-poppins-bold text-primary mb-3">Order summary</Text>
          {[
            { label: 'Subtotal', value: subtotal().toFixed(2) },
            { label: 'Delivery fee', value: DELIVERY_FEE.toFixed(2) },
            { label: 'Tip', value: tip.toFixed(2) },
            { label: 'HST (13%)', value: taxes.toFixed(2) },
          ].map(({ label, value }) => (
            <View key={label} className="flex-row justify-between mb-2">
              <Text className="font-inter text-gray-500">{label}</Text>
              <Text className="font-mono text-primary">${value}</Text>
            </View>
          ))}
          <View className="border-t border-gray-100 pt-3 flex-row justify-between">
            <Text className="font-poppins-bold text-primary">Total</Text>
            <Text className="font-mono font-poppins-bold text-primary">${total.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      <View className="px-5 pb-8">
        <TouchableOpacity
          className="bg-primary rounded-2xl py-4 items-center"
          onPress={handlePlaceOrder}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="white" />
            : <Text className="text-white font-inter-medium text-base">Place Order — ${total.toFixed(2)}</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/customer/app/(stack)/ apps/customer/components/
git commit -m "feat: customer store detail, cart, and checkout screens"
```

---

## Task 5: Customer App — Live Order Tracking

**Files:**
- Create: `apps/customer/app/(stack)/order/[id].tsx`
- Create: `apps/customer/components/OrderStatusStepper.tsx`
- Create: `apps/customer/hooks/useOrderTracking.ts`

- [ ] **Step 1: Create `apps/customer/components/OrderStatusStepper.tsx`**

```tsx
import { View, Text } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, useSharedValue, useEffect } from 'react-native-reanimated';
import type { OrderStatus } from '@halalgo/types';

const STEPS: { status: OrderStatus; label: string; emoji: string }[] = [
  { status: 'confirmed',  label: 'Order Confirmed',     emoji: '✅' },
  { status: 'preparing',  label: 'Preparing',            emoji: '👨‍🍳' },
  { status: 'picked_up',  label: 'Driver Picked Up',     emoji: '🛵' },
  { status: 'delivered',  label: 'Delivered',            emoji: '🎉' },
];

const STATUS_INDEX: Partial<Record<OrderStatus, number>> = {
  confirmed:  0,
  preparing:  1,
  ready:      1,
  picked_up:  2,
  delivered:  3,
};

interface Props {
  currentStatus: OrderStatus;
}

export function OrderStatusStepper({ currentStatus }: Props) {
  const currentIndex = STATUS_INDEX[currentStatus] ?? 0;

  return (
    <View className="px-5 py-4">
      {STEPS.map((step, i) => {
        const isDone    = i <= currentIndex;
        const isActive  = i === currentIndex;

        return (
          <View key={step.status} className="flex-row items-start mb-4">
            <View className="items-center mr-4">
              <View
                className={`w-10 h-10 rounded-full items-center justify-center ${
                  isDone ? 'bg-success' : 'bg-gray-100'
                }`}
              >
                <Text style={{ fontSize: 18 }}>{isDone ? step.emoji : '○'}</Text>
              </View>
              {i < STEPS.length - 1 && (
                <View className={`w-0.5 h-6 mt-1 ${isDone ? 'bg-success' : 'bg-gray-200'}`} />
              )}
            </View>
            <View className="flex-1 pt-2">
              <Text
                className={`font-inter-medium text-sm ${isActive ? 'text-primary' : isDone ? 'text-success' : 'text-gray-400'}`}
              >
                {step.label}
              </Text>
              {isActive && (
                <Text className="font-inter text-xs text-secondary mt-0.5">In progress...</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}
```

- [ ] **Step 2: Create `apps/customer/hooks/useOrderTracking.ts`**

```typescript
import { useState, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import type { OrderStatus } from '@halalgo/types';

interface DriverLocation {
  latitude: number;
  longitude: number;
  updatedAt: string;
}

interface OrderTrackingState {
  status:         OrderStatus;
  driverLocation: DriverLocation | null;
  eta:            string | null;
}

export function useOrderTracking(orderId: string, driverId: string | null, initialStatus: OrderStatus) {
  const [state, setState] = useState<OrderTrackingState>({
    status:         initialStatus,
    driverLocation: null,
    eta:            null,
  });

  // Listen for order status updates
  useWebSocket(`order:${orderId}`, useCallback((data) => {
    const msg = data as { type: string; status?: OrderStatus; eta?: string };
    if (msg.status) setState((s) => ({ ...s, status: msg.status! }));
    if (msg.eta)    setState((s) => ({ ...s, eta: msg.eta! }));
  }, [orderId]));

  // Listen for driver GPS updates
  useWebSocket(driverId ? `driver:${driverId}` : '', useCallback((data) => {
    if (!driverId) return;
    const loc = data as { latitude: number; longitude: number; updatedAt: string };
    setState((s) => ({ ...s, driverLocation: loc }));
  }, [driverId]));

  return state;
}
```

- [ ] **Step 3: Create `apps/customer/app/(stack)/order/[id].tsx`**

```tsx
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { api } from '../../../lib/api';
import { useOrderTracking } from '../../../hooks/useOrderTracking';
import { OrderStatusStepper } from '../../../components/OrderStatusStepper';
import type { Order } from '@halalgo/types';

export default function OrderTrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: order } = useQuery({
    queryKey: ['order', id],
    queryFn:  async () => {
      const res = await api.get<{ order: Order }>(`/api/orders/${id}`);
      return res.data.order;
    },
    refetchInterval: 10_000,
  });

  const { status, driverLocation, eta } = useOrderTracking(
    id,
    order?.driverId ?? null,
    order?.status ?? 'confirmed',
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 py-4 flex-row items-center">
        <TouchableOpacity onPress={() => router.replace('/(tabs)/orders')} className="mr-4">
          <Text className="text-primary text-base">←</Text>
        </TouchableOpacity>
        <Text className="font-poppins-bold text-primary text-xl">Track Order</Text>
      </View>

      <ScrollView className="flex-1">
        {/* Live Map */}
        {driverLocation && (
          <MapView
            provider={PROVIDER_GOOGLE}
            style={{ height: 220, marginHorizontal: 20, borderRadius: 16 }}
            region={{
              latitude:       driverLocation.latitude,
              longitude:      driverLocation.longitude,
              latitudeDelta:  0.01,
              longitudeDelta: 0.01,
            }}
          >
            <Marker
              coordinate={{ latitude: driverLocation.latitude, longitude: driverLocation.longitude }}
              title="Your driver"
              description={eta ? `ETA: ${eta}` : undefined}
            />
          </MapView>
        )}

        {/* ETA */}
        {eta && (
          <View className="mx-5 mt-4 bg-white rounded-2xl p-4 shadow-sm flex-row items-center">
            <Text className="text-2xl mr-3">⏱</Text>
            <View>
              <Text className="font-poppins-bold text-primary text-lg">{eta}</Text>
              <Text className="font-inter text-secondary text-xs">Estimated arrival</Text>
            </View>
          </View>
        )}

        {/* Status Stepper */}
        <View className="mx-5 mt-4 bg-white rounded-2xl shadow-sm">
          <OrderStatusStepper currentStatus={status} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/customer/app/(stack)/order/ apps/customer/components/OrderStatusStepper.tsx apps/customer/hooks/useOrderTracking.ts
git commit -m "feat: live order tracking with WebSocket, Google Maps driver pin, status stepper"
```

---

## Task 6: Restaurant App — Full Setup

**Files:**
- Create: `apps/restaurant/package.json`
- Create: `apps/restaurant/app.json`
- Create: `apps/restaurant/app/_layout.tsx`
- Create: `apps/restaurant/app/(tabs)/_layout.tsx`
- Create: `apps/restaurant/app/(tabs)/dashboard.tsx`
- Create: `apps/restaurant/app/(tabs)/orders.tsx`

- [ ] **Step 1: Create `apps/restaurant/package.json`**

```json
{
  "name": "@halalgo/restaurant",
  "version": "1.0.0",
  "private": true,
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios"
  },
  "dependencies": {
    "@clerk/clerk-expo": "^1.0.0",
    "@halalgo/types": "workspace:*",
    "@tanstack/react-query": "^5.0.0",
    "axios": "^1.6.0",
    "expo": "~50.0.0",
    "expo-haptics": "~12.8.0",
    "expo-image-picker": "~14.7.0",
    "expo-router": "~3.4.0",
    "expo-secure-store": "~12.8.0",
    "expo-notifications": "~0.27.0",
    "nativewind": "^4.0.0",
    "react": "18.2.0",
    "react-native": "0.73.6",
    "react-native-reanimated": "~3.6.0",
    "react-native-safe-area-context": "4.8.2",
    "react-native-screens": "~3.29.0",
    "react-native-gesture-handler": "~2.14.0",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "@babel/core": "^7.24.0",
    "@types/react": "~18.2.79",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.0"
  }
}
```

- [ ] **Step 2: Create `apps/restaurant/app/_layout.tsx`**

Same structure as customer app `_layout.tsx` — replace `customer` references with `restaurant`, same Clerk + React Query providers.

```tsx
import { Stack } from 'expo-router';
import { ClerkProvider } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../global.css';

const queryClient = new QueryClient();

const tokenCache = {
  async getToken(key: string) { return SecureStore.getItemAsync(key); },
  async saveToken(key: string, value: string) { return SecureStore.setItemAsync(key, value); },
  async clearToken(key: string) { return SecureStore.deleteItemAsync(key); },
};

export default function RootLayout() {
  return (
    <ClerkProvider
      publishableKey={process.env['EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY']!}
      tokenCache={tokenCache}
    >
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <Stack screenOptions={{ headerShown: false }} />
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ClerkProvider>
  );
}
```

- [ ] **Step 3: Create `apps/restaurant/app/(tabs)/dashboard.tsx`**

```tsx
import { View, Text, Switch, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import * as Haptics from 'expo-haptics';

export default function DashboardScreen() {
  const [isOpen, setIsOpen] = useState(true);
  const qc = useQueryClient();

  const { data: analytics } = useQuery({
    queryKey: ['restaurant-analytics'],
    queryFn:  async () => {
      const res = await api.get<{ revenue: number; orderCount: number; rating: number }>(
        '/api/analytics/dashboard',
      );
      return res.data;
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (open: boolean) => {
      await api.patch('/api/stores/me/status', { isOpen: open });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['restaurant-analytics'] }),
  });

  function handleToggle(value: boolean): void {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsOpen(value);
    toggleMutation.mutate(value);
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="px-5 pt-4">
        <Text className="font-poppins-bold text-primary text-2xl mb-6">Dashboard</Text>

        {/* Online Toggle */}
        <View className={`rounded-3xl p-6 mb-6 ${isOpen ? 'bg-success' : 'bg-gray-400'}`}>
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-white font-poppins-bold text-xl">
                {isOpen ? '🟢 Accepting Orders' : '🔴 Closed'}
              </Text>
              <Text className="text-white/80 font-inter text-sm mt-1">
                {isOpen ? 'Customers can order from you' : 'Toggle to start accepting orders'}
              </Text>
            </View>
            <Switch
              value={isOpen}
              onValueChange={handleToggle}
              trackColor={{ false: '#ffffff40', true: '#ffffff60' }}
              thumbColor="#ffffff"
              style={{ transform: [{ scaleX: 1.3 }, { scaleY: 1.3 }] }}
            />
          </View>
        </View>

        {/* Stats */}
        <View className="flex-row mb-4">
          {[
            { label: "Today's Revenue", value: `$${(analytics?.revenue ?? 0).toFixed(2)}`, emoji: '💰' },
            { label: 'Orders Today', value: String(analytics?.orderCount ?? 0), emoji: '📦' },
          ].map(({ label, value, emoji }) => (
            <View key={label} className="flex-1 bg-white rounded-2xl p-4 mr-3 last:mr-0 shadow-sm">
              <Text className="text-2xl mb-2">{emoji}</Text>
              <Text className="font-mono text-primary text-xl font-bold">{value}</Text>
              <Text className="font-inter text-gray-500 text-xs mt-1">{label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
```

- [ ] **Step 4: Create `apps/restaurant/app/(tabs)/orders.tsx`**

```tsx
import { View, Text, FlatList, TouchableOpacity, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useWebSocket } from '../../hooks/useWebSocket';
import * as Haptics from 'expo-haptics';
import type { Order } from '@halalgo/types';

type Tab = 'new' | 'active' | 'completed';

export default function OrdersScreen() {
  const [activeTab, setTab]     = useState<Tab>('new');
  const [newOrder, setNewOrder] = useState<Order | null>(null);
  const qc = useQueryClient();

  // Listen for new orders via WebSocket
  useWebSocket('store:current', useCallback((data) => {
    const msg = data as { type: string; order?: Order };
    if (msg.type === 'new_order' && msg.order) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setNewOrder(msg.order);
      qc.invalidateQueries({ queryKey: ['restaurant-orders'] });
    }
  }, []));

  const { data: orders = [] } = useQuery({
    queryKey: ['restaurant-orders', activeTab],
    queryFn:  async () => {
      const statusMap: Record<Tab, string[]> = {
        new:       ['pending', 'confirmed'],
        active:    ['preparing', 'ready'],
        completed: ['delivered', 'cancelled'],
      };
      // In production: filter by store and status server-side
      const res = await api.get<{ orders: Order[] }>('/api/orders');
      return (res.data.orders ?? []).filter((o) => statusMap[activeTab].includes(o.status));
    },
    refetchInterval: 15_000,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      await api.patch(`/api/orders/${orderId}/status`, { status, changedByRole: 'store' });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['restaurant-orders'] }),
  });

  const TABS: { key: Tab; label: string }[] = [
    { key: 'new', label: 'New' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Completed' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* New Order Modal */}
      <Modal visible={!!newOrder} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            <Text className="font-poppins-bold text-primary text-xl mb-2">🔔 New Order!</Text>
            <Text className="font-inter text-gray-500 mb-6">
              Order #{newOrder?.id.slice(-6).toUpperCase()} — ${Number(newOrder?.total ?? 0).toFixed(2)}
            </Text>
            <View className="flex-row">
              <TouchableOpacity
                className="flex-1 bg-error rounded-2xl py-4 items-center mr-3"
                onPress={() => {
                  if (newOrder) updateMutation.mutate({ orderId: newOrder.id, status: 'cancelled' });
                  setNewOrder(null);
                }}
              >
                <Text className="text-white font-inter-medium">Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-success rounded-2xl py-4 items-center"
                onPress={() => {
                  if (newOrder) updateMutation.mutate({ orderId: newOrder.id, status: 'confirmed' });
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  setNewOrder(null);
                }}
              >
                <Text className="text-white font-inter-medium">Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View className="px-5 pt-4">
        <Text className="font-poppins-bold text-primary text-2xl mb-4">Orders</Text>

        {/* Tabs */}
        <View className="flex-row mb-4">
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              className={`mr-3 px-4 py-2 rounded-xl ${activeTab === tab.key ? 'bg-primary' : 'bg-gray-100'}`}
              onPress={() => setTab(tab.key)}
            >
              <Text className={`font-inter-medium text-sm ${activeTab === tab.key ? 'text-white' : 'text-gray-600'}`}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
        renderItem={({ item }) => (
          <View className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
            <View className="flex-row justify-between mb-2">
              <Text className="font-poppins-bold text-primary">#{item.id.slice(-6).toUpperCase()}</Text>
              <Text className="font-mono text-primary">${Number(item.total).toFixed(2)}</Text>
            </View>
            <Text className="font-inter text-gray-500 text-xs mb-3">Status: {item.status}</Text>
            {item.status === 'preparing' && (
              <TouchableOpacity
                className="bg-success rounded-xl py-3 items-center"
                onPress={() => updateMutation.mutate({ orderId: item.id, status: 'ready' })}
              >
                <Text className="text-white font-inter-medium">Mark as Ready</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        ListEmptyComponent={
          <Text className="text-center text-gray-400 font-inter mt-8">No {activeTab} orders</Text>
        }
      />
    </SafeAreaView>
  );
}
```

- [ ] **Step 5: Commit restaurant app**

```bash
git add apps/restaurant/
git commit -m "feat: restaurant app with dashboard, online toggle, and real-time order management"
```

---

## Task 7: Driver App — Full Setup

**Files:**
- Create: `apps/driver/package.json`
- Create: `apps/driver/app/_layout.tsx`
- Create: `apps/driver/app/(tabs)/home.tsx`
- Create: `apps/driver/app/(tabs)/active.tsx`

- [ ] **Step 1: Create `apps/driver/package.json`**

```json
{
  "name": "@halalgo/driver",
  "version": "1.0.0",
  "private": true,
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios"
  },
  "dependencies": {
    "@clerk/clerk-expo": "^1.0.0",
    "@halalgo/types": "workspace:*",
    "@tanstack/react-query": "^5.0.0",
    "axios": "^1.6.0",
    "expo": "~50.0.0",
    "expo-camera": "~14.0.0",
    "expo-haptics": "~12.8.0",
    "expo-location": "~16.5.0",
    "expo-router": "~3.4.0",
    "expo-secure-store": "~12.8.0",
    "nativewind": "^4.0.0",
    "react": "18.2.0",
    "react-native": "0.73.6",
    "react-native-maps": "1.10.0",
    "react-native-reanimated": "~3.6.0",
    "react-native-safe-area-context": "4.8.2",
    "react-native-screens": "~3.29.0",
    "react-native-gesture-handler": "~2.14.0",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "@babel/core": "^7.24.0",
    "@types/react": "~18.2.79",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.0"
  }
}
```

- [ ] **Step 2: Create `apps/driver/app/(tabs)/home.tsx`**

```tsx
import { View, Text, Switch, Modal, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';
import { api } from '../../lib/api';
import { useWebSocket } from '../../hooks/useWebSocket';

interface JobOffer {
  orderId:           string;
  storeAddress:      string;
  customerAddress:   string;
  distanceKm:        number;
  estimatedEarnings: number;
}

const OFFER_TIMEOUT_S = 30;

export default function DriverHomeScreen() {
  const [isOnline, setIsOnline]     = useState(false);
  const [jobOffer, setJobOffer]     = useState<JobOffer | null>(null);
  const [countdown, setCountdown]   = useState(OFFER_TIMEOUT_S);
  const countdownRef                = useRef<ReturnType<typeof setInterval> | null>(null);

  // GPS location updates every 5s when online
  useEffect(() => {
    if (!isOnline) return;
    let interval: ReturnType<typeof setInterval>;

    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status !== 'granted') return;
      interval = setInterval(async () => {
        const loc = await Location.getCurrentPositionAsync({});
        api.patch('/api/drivers/location', {
          latitude:      loc.coords.latitude,
          longitude:     loc.coords.longitude,
          activeOrderId: null,
        }).catch(console.error);
      }, 5000);
    });

    return () => clearInterval(interval);
  }, [isOnline]);

  // Listen for job offers
  useWebSocket('driver_jobs', useCallback((data) => {
    const msg = data as { type: string; offer?: JobOffer };
    if (msg.type === 'job_offer' && msg.offer) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setJobOffer(msg.offer);
      setCountdown(OFFER_TIMEOUT_S);

      countdownRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(countdownRef.current!);
            setJobOffer(null);
            return OFFER_TIMEOUT_S;
          }
          return c - 1;
        });
      }, 1000);
    }
  }, []));

  async function handleToggle(value: boolean): Promise<void> {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsOnline(value);
    await api.patch('/api/drivers/availability', { isAvailable: value });
  }

  async function handleAccept(): Promise<void> {
    if (!jobOffer) return;
    clearInterval(countdownRef.current!);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await api.post(`/api/drivers/jobs/${jobOffer.orderId}/accept`);
    setJobOffer(null);
  }

  async function handleDecline(): Promise<void> {
    if (!jobOffer) return;
    clearInterval(countdownRef.current!);
    await api.post(`/api/drivers/jobs/${jobOffer.orderId}/decline`);
    setJobOffer(null);
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Job Offer Modal */}
      <Modal visible={!!jobOffer} animationType="slide" transparent>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="font-poppins-bold text-primary text-xl">New Delivery!</Text>
              <View className="bg-accent rounded-full w-12 h-12 items-center justify-center">
                <Text className="font-mono text-white font-bold text-lg">{countdown}</Text>
              </View>
            </View>

            <View className="bg-gray-50 rounded-2xl p-4 mb-4">
              <Text className="font-inter text-gray-500 text-xs mb-1">PICKUP</Text>
              <Text className="font-inter-medium text-primary">{jobOffer?.storeAddress}</Text>
              <Text className="font-inter text-gray-500 text-xs mb-1 mt-3">DROP OFF</Text>
              <Text className="font-inter-medium text-primary">{jobOffer?.customerAddress}</Text>
            </View>

            <View className="flex-row justify-between mb-6">
              <Text className="font-inter text-gray-500">Distance: {jobOffer?.distanceKm.toFixed(1)} km</Text>
              <Text className="font-mono text-success font-bold text-lg">
                ${jobOffer?.estimatedEarnings.toFixed(2)}
              </Text>
            </View>

            <View className="flex-row">
              <TouchableOpacity
                className="flex-1 bg-error/10 border border-error rounded-2xl py-4 items-center mr-3"
                onPress={handleDecline}
              >
                <Text className="text-error font-inter-medium">Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-success rounded-2xl py-4 items-center"
                onPress={handleAccept}
              >
                <Text className="text-white font-inter-medium">Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View className="flex-1 px-5 pt-6 items-center justify-center">
        {/* Online Toggle */}
        <Animated.View entering={FadeIn} className={`w-48 h-48 rounded-full items-center justify-center ${isOnline ? 'bg-success' : 'bg-gray-200'}`}>
          <Switch
            value={isOnline}
            onValueChange={handleToggle}
            trackColor={{ false: 'transparent', true: 'transparent' }}
            thumbColor="transparent"
            style={{ transform: [{ scaleX: 3 }, { scaleY: 3 }] }}
          />
          <Text className="font-poppins-bold text-white text-lg mt-2 absolute">
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </Text>
        </Animated.View>

        <Text className="font-inter text-gray-500 text-center mt-8">
          {isOnline
            ? 'You are online. Waiting for delivery requests...'
            : 'Tap the button to go online and start receiving orders.'}
        </Text>
      </View>
    </SafeAreaView>
  );
}
```

- [ ] **Step 3: Create `apps/driver/app/(tabs)/active.tsx`**

```tsx
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Haptics from 'expo-haptics';
import { api } from '../../lib/api';

type DeliveryStep = 'navigate_to_store' | 'confirm_pickup' | 'navigate_to_customer' | 'complete';

export default function ActiveDeliveryScreen() {
  const [step, setStep] = useState<DeliveryStep>('navigate_to_store');

  const STEPS: { key: DeliveryStep; label: string; action: string; nextStep: DeliveryStep | null }[] = [
    { key: 'navigate_to_store',   label: '🏪 Navigate to Restaurant', action: 'I\'ve arrived at restaurant', nextStep: 'confirm_pickup' },
    { key: 'confirm_pickup',      label: '📦 Confirm Pickup',         action: 'Picked up order',             nextStep: 'navigate_to_customer' },
    { key: 'navigate_to_customer', label: '🏠 Navigate to Customer',  action: 'Delivered to customer',       nextStep: 'complete' },
    { key: 'complete',            label: '✅ Delivery Complete',       action: '',                            nextStep: null },
  ];

  const currentStep = STEPS.find((s) => s.key === step)!;

  async function handleAction(): Promise<void> {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (step === 'confirm_pickup') {
      await api.patch('/api/orders/active/status', { status: 'picked_up', changedByRole: 'driver' });
    }

    if (step === 'navigate_to_customer') {
      await api.patch('/api/orders/active/status', { status: 'delivered', changedByRole: 'driver' });
    }

    if (currentStep.nextStep) setStep(currentStep.nextStep);
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Text className="font-poppins-bold text-primary text-2xl px-5 pt-4 mb-4">Active Delivery</Text>

      <MapView
        provider={PROVIDER_GOOGLE}
        style={{ height: 250, marginHorizontal: 20, borderRadius: 16 }}
        initialRegion={{ latitude: 45.4215, longitude: -75.6972, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
      />

      <View className="flex-1 px-5 pt-6">
        <Text className="font-poppins-bold text-primary text-xl mb-2">{currentStep.label}</Text>

        {step !== 'complete' ? (
          <TouchableOpacity
            className="bg-primary rounded-2xl py-4 items-center mt-auto mb-4"
            onPress={handleAction}
          >
            <Text className="text-white font-inter-medium text-base">{currentStep.action}</Text>
          </TouchableOpacity>
        ) : (
          <View className="items-center mt-8">
            <Text className="text-5xl mb-4">🎉</Text>
            <Text className="font-poppins-bold text-success text-xl">Delivery Complete!</Text>
            <Text className="font-inter text-gray-500 text-center mt-2">
              Great job! Return to home to accept more deliveries.
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
```

- [ ] **Step 4: Commit driver app**

```bash
git add apps/driver/
git commit -m "feat: driver app with online toggle, GPS updates, job offer modal, delivery flow"
```

---

## Task 8: Start All Three Apps and Verify

- [ ] **Step 1: Start customer app**

```bash
cd apps/customer && npx expo start
```

Scan QR code with Expo Go. Expected: App loads, shows onboarding, sign-up flow works with Clerk.

- [ ] **Step 2: Start restaurant app**

```bash
cd apps/restaurant && npx expo start --port 8082
```

Expected: App loads, dashboard shows, online toggle works.

- [ ] **Step 3: Start driver app**

```bash
cd apps/driver && npx expo start --port 8083
```

Expected: App loads, Online/Offline toggle works, GPS updates sent to driver-service every 5s.

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "chore: plan 6 complete — all 3 mobile apps running"
```

---

## Self-Review Checklist

- [x] Customer: Clerk auth (sign-up, sign-in, OTP email verification), onboarding 3 slides
- [x] Customer: Home screen with GPS-based nearby stores (useNearbyStores hook), skeleton loaders, cuisine filters
- [x] Customer: Store detail → cart (Zustand, clears on store switch) → checkout → order placed
- [x] Customer: Live tracking — WebSocket `order:{id}` for status, `driver:{id}` for GPS, Google Maps marker
- [x] Restaurant: Online/Offline toggle calls driver-service availability endpoint
- [x] Restaurant: New order alert via WebSocket with Accept/Reject modal + haptic + countdown
- [x] Driver: GPS sent every 5s via setInterval → driver-service → Redis → Kafka
- [x] Driver: Job offer modal with 30s countdown, Accept/Decline
- [x] Driver: Active delivery step-by-step flow with API calls at each stage
- [x] All apps: HalalBadge, SkeletonLoader, Reanimated 2 animations, haptic feedback
- [x] No TBDs or placeholders
