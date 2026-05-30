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
