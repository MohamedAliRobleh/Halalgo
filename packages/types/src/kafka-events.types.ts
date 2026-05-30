import type { OrderStatus, ChangedByRole } from './order.types.js';

export interface KafkaEvent<T> {
  eventId: string;
  occurredAt: string;
  payload: T;
}

export interface OrderCreatedPayload {
  orderId: string;
  clerkCustomerId: string;
  storeId: string;
  total: number;
  items: Array<{ menuItemId: string; quantity: number; unitPrice: number }>;
}

export interface OrderStatusUpdatedPayload {
  orderId: string;
  previousStatus: OrderStatus;
  newStatus: OrderStatus;
  changedByRole: ChangedByRole;
  clerkCustomerId: string;
  storeId: string;
  driverId: string | null;
}

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

export interface OrderCancelledPayload {
  orderId: string;
  clerkCustomerId: string;
  storeId: string;
  driverId: string | null;
  reason: string;
  stripePaymentIntentId: string | null;
}

export interface DriverLocationUpdatedPayload {
  driverId: string;
  latitude: number;
  longitude: number;
  activeOrderId: string | null;
  updatedAt: string;
}

export interface DriverAvailabilityChangedPayload {
  driverId: string;
  isAvailable: boolean;
  latitude: number | null;
  longitude: number | null;
}

export interface PaymentCompletedPayload {
  orderId: string;
  stripePaymentIntentId: string;
  amount: number;
  clerkCustomerId: string;
}

export interface PaymentRefundedPayload {
  orderId: string;
  stripeRefundId: string;
  amount: number;
  reason: string;
}

export interface StoreStatusChangedPayload {
  storeId: string;
  isOpen: boolean;
  isVerified: boolean;
}

export interface ReviewCreatedPayload {
  reviewId: string;
  orderId: string;
  storeId: string;
  driverId: string | null;
  storeRating: number;
  driverRating: number | null;
}

export interface NotificationSendPayload {
  clerkUserId: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
}
