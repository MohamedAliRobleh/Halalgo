import { db, driverProfiles } from '../db/index.js';
import { eq, and, gte, lte } from 'drizzle-orm';
import { publishEvent, KAFKA_TOPICS } from '@halalgo/kafka';

export interface NearbyDriver {
  clerkUserId: string;
  distanceM: number;
}

function haversineDistanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function selectNearestDrivers(
  storeLat: number,
  storeLng: number,
  radiusKm: number = 5,
  limit: number = 10,
): Promise<NearbyDriver[]> {
  // Bounding box for pre-filter
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((storeLat * Math.PI) / 180));

  const rows = await db
    .select()
    .from(driverProfiles)
    .where(
      and(
        eq(driverProfiles.isAvailable, true),
        eq(driverProfiles.isVerified, true),
        gte(driverProfiles.latitude, String(storeLat - latDelta)),
        lte(driverProfiles.latitude, String(storeLat + latDelta)),
        gte(driverProfiles.longitude, String(storeLng - lngDelta)),
        lte(driverProfiles.longitude, String(storeLng + lngDelta)),
      ),
    );

  const radiusM = radiusKm * 1000;

  return rows
    .filter((r) => r.latitude !== null && r.longitude !== null)
    .map((r) => ({
      clerkUserId: r.clerkUserId,
      distanceM:   haversineDistanceM(storeLat, storeLng, Number(r.latitude), Number(r.longitude)),
    }))
    .filter((d) => d.distanceM <= radiusM)
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, limit);
}

export async function dispatchOrder(
  orderId: string,
  storeLat: number,
  storeLng: number,
): Promise<void> {
  const drivers = await selectNearestDrivers(storeLat, storeLng);
  if (drivers.length === 0) return;

  // Offer to closest driver — accept/decline handled by driver app
  await publishEvent(KAFKA_TOPICS.DRIVER_LOCATION_UPDATED, {
    driverId:      `__dispatch__${orderId}`,
    latitude:      storeLat,
    longitude:     storeLng,
    activeOrderId: orderId,
    updatedAt:     new Date().toISOString(),
  });
}
