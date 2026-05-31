import type { Request, Response } from 'express';
import { db, customerProfiles } from '../db/index.js';
import { eq } from 'drizzle-orm';

export async function getProfile(req: Request, res: Response): Promise<void> {
  const clerkUserId = req.headers['x-clerk-user-id'] as string;
  const rows = await db.select().from(customerProfiles).where(eq(customerProfiles.clerkUserId, clerkUserId));

  if (rows.length === 0) {
    const [profile] = await db.insert(customerProfiles).values({ clerkUserId }).returning();
    res.json({ profile });
    return;
  }

  res.json({ profile: rows[0] });
}
