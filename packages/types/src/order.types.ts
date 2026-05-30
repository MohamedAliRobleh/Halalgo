export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'picked_up'
  | 'delivered'
  | 'cancelled';

export type ChangedByRole = 'customer' | 'store' | 'driver' | 'system' | 'admin';

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
