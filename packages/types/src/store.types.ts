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
  openTime: string;
  closeTime: string;
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
