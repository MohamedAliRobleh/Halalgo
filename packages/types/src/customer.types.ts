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
