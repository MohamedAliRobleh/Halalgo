import Expo from 'expo-server-sdk';
import type { ExpoPushMessage } from 'expo-server-sdk';
import { db, pushTokens, notifications } from '../db/index.js';
import { eq } from 'drizzle-orm';

const expo = new Expo();

export interface PushPayload {
  clerkUserId: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
}

export function chunkTokens<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export async function sendPushNotification(payload: PushPayload): Promise<void> {
  const tokens = await db
    .select()
    .from(pushTokens)
    .where(eq(pushTokens.clerkUserId, payload.clerkUserId));

  const validTokens = tokens.filter((t) => Expo.isExpoPushToken(t.token));
  if (validTokens.length === 0) return;

  const messages: ExpoPushMessage[] = validTokens.map((t) => ({
    to:    t.token,
    title: payload.title,
    body:  payload.body,
    data:  payload.data,
    sound: 'default' as const,
  }));

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    await expo.sendPushNotificationsAsync(chunk);
  }

  await db.insert(notifications).values({
    clerkUserId: payload.clerkUserId,
    title:       payload.title,
    body:        payload.body,
    data:        payload.data,
  });
}
