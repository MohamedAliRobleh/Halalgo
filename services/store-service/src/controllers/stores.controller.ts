import type { Request, Response } from 'express';
import { db, stores } from '../db/index.js';
import { eq, and, gte, lte } from 'drizzle-orm';
import { publishEvent, KAFKA_TOPICS } from '@halalgo/kafka';
import { z } from 'zod';

export async function getNearbyStores(req: Request, res: Response): Promise<void> {
  const lat = parseFloat(req.query['lat'] as string);
  const lng = parseFloat(req.query['lng'] as string);
  const radiusKm = parseFloat((req.query['radiusKm'] as string) ?? '10');
  const storeType = req.query['storeType'] as string | undefined;

  if (isNaN(lat) || isNaN(lng)) {
    res.status(400).json({ error: 'lat and lng query params are required' });
    return;
  }

  // Approximate bounding box: 1 degree lat ≈ 111km
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));

  const conditions = [
    gte(stores.latitude, String(lat - latDelta)),
    lte(stores.latitude, String(lat + latDelta)),
    gte(stores.longitude, String(lng - lngDelta)),
    lte(stores.longitude, String(lng + lngDelta)),
    eq(stores.isVerified, true),
  ];

  if (storeType === 'restaurant' || storeType === 'grocery') {
    conditions.push(eq(stores.storeType, storeType));
  }

  const rows = await db
    .select()
    .from(stores)
    .where(and(...conditions));

  res.json({ stores: rows });
}

export async function getStoreById(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const rows = await db.select().from(stores).where(eq(stores.id, id));

  if (rows.length === 0) {
    res.status(404).json({ error: 'Store not found' });
    return;
  }

  res.json({ store: rows[0] });
}

export async function updateStoreStatus(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const { isOpen } = req.body as { isOpen: boolean };

  await db
    .update(stores)
    .set({ isOpen, updatedAt: new Date() })
    .where(eq(stores.id, id));

  await publishEvent(KAFKA_TOPICS.STORE_STATUS_CHANGED, {
    storeId: id,
    isOpen,
    isVerified: true,
  });

  res.json({ success: true });
}
