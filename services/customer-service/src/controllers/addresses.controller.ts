import type { Request, Response } from 'express';
import { db, addresses } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

export const createAddressSchema = z.object({
  label:      z.string().default('Home'),
  street:     z.string().min(1),
  city:       z.string().min(1),
  province:   z.string().length(2),
  postalCode: z.string().min(3),
  latitude:   z.number().min(-90).max(90).optional(),
  longitude:  z.number().min(-180).max(180).optional(),
  isDefault:  z.boolean().default(false),
});

export async function getAddresses(req: Request, res: Response): Promise<void> {
  const clerkUserId = req.headers['x-clerk-user-id'] as string;
  const rows = await db.select().from(addresses).where(eq(addresses.clerkUserId, clerkUserId));
  res.json({ addresses: rows });
}

export async function createAddress(req: Request, res: Response): Promise<void> {
  const clerkUserId = req.headers['x-clerk-user-id'] as string;
  const body = req.body as z.infer<typeof createAddressSchema>;

  const [address] = await db
    .insert(addresses)
    .values({
      ...body,
      clerkUserId,
      latitude:  body.latitude !== undefined ? String(body.latitude) : null,
      longitude: body.longitude !== undefined ? String(body.longitude) : null,
    })
    .returning();

  res.status(201).json({ address });
}

export async function deleteAddress(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  await db.delete(addresses).where(eq(addresses.id, id));
  res.json({ success: true });
}
