import type { Request, Response } from 'express';
import { Redis } from 'ioredis';
import { db, driverProfiles } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { publishEvent, KAFKA_TOPICS } from '@halalgo/kafka';
import { z } from 'zod';

let locationRedis: Redis | null = null;

function getLocationRedis(): Redis {
  if (locationRedis) return locationRedis;
  const url = process.env['REDIS_DRIVER_LOCATION_URL'] ?? 'redis://localhost:6379';
  locationRedis = new Redis(url);
  return locationRedis;
}

export const updateLocationSchema = z.object({
  latitude:      z.number().min(-90).max(90),
  longitude:     z.number().min(-180).max(180),
  activeOrderId: z.string().nullable().default(null),
});

export const updateAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
});

export async function updateLocation(req: Request, res: Response): Promise<void> {
  const clerkUserId = req.headers['x-clerk-user-id'] as string;
  const { latitude, longitude, activeOrderId } = req.body as z.infer<typeof updateLocationSchema>;

  // Cache in Redis with 30s TTL
  const redis = getLocationRedis();
  const locationData = { lat: latitude, lng: longitude, updatedAt: new Date().toISOString() };
  await redis.setex(`driver:${clerkUserId}:location`, 30, JSON.stringify(locationData));

  // Update lat/lng in DB (fire-and-forget)
  db.update(driverProfiles)
    .set({ latitude: String(latitude), longitude: String(longitude) })
    .where(eq(driverProfiles.clerkUserId, clerkUserId))
    .then(() => {})
    .catch(console.error);

  // Publish to Kafka
  await publishEvent(KAFKA_TOPICS.DRIVER_LOCATION_UPDATED, {
    driverId:     clerkUserId,
    latitude,
    longitude,
    activeOrderId,
    updatedAt:    new Date().toISOString(),
  }, clerkUserId);

  res.json({ success: true });
}

export async function updateAvailability(req: Request, res: Response): Promise<void> {
  const clerkUserId = req.headers['x-clerk-user-id'] as string;
  const { isAvailable } = req.body as z.infer<typeof updateAvailabilitySchema>;

  await db
    .update(driverProfiles)
    .set({ isAvailable })
    .where(eq(driverProfiles.clerkUserId, clerkUserId));

  await publishEvent(KAFKA_TOPICS.DRIVER_AVAILABILITY_CHANGED, {
    driverId:    clerkUserId,
    isAvailable,
    latitude:    null,
    longitude:   null,
  });

  res.json({ success: true });
}
