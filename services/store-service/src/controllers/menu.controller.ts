import type { Request, Response } from 'express';
import { db, menuItems, menuCategories } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

export const createMenuItemSchema = z.object({
  categoryId:  z.string(),
  name:        z.string().min(1),
  description: z.string().optional(),
  basePrice:   z.number().positive(),
  imageUrl:    z.string().url().optional(),
  isAvailable: z.boolean().default(true),
  isFeatured:  z.boolean().default(false),
  prepTimeMin: z.number().int().min(1).default(10),
  allergens:   z.array(z.string()).default([]),
  calories:    z.number().int().positive().optional(),
});

export async function getMenuByStore(req: Request, res: Response): Promise<void> {
  const { storeId } = req.params as { storeId: string };
  const items = await db.select().from(menuItems).where(eq(menuItems.storeId, storeId));
  res.json({ items });
}

export async function createMenuItem(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof createMenuItemSchema>;
  const { storeId } = req.params as { storeId: string };

  const [item] = await db
    .insert(menuItems)
    .values({ ...body, storeId, basePrice: String(body.basePrice) })
    .returning();

  res.status(201).json({ item });
}

export async function updateItemAvailability(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const { isAvailable } = req.body as { isAvailable: boolean };
  await db.update(menuItems).set({ isAvailable }).where(eq(menuItems.id, id));
  res.json({ success: true });
}

export async function deleteMenuItem(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  await db.delete(menuItems).where(eq(menuItems.id, id));
  res.json({ success: true });
}
