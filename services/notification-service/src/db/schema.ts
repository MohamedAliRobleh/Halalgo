import {
  pgSchema, text, boolean, jsonb, timestamp, index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const notifSchema = pgSchema('notif_schema');

export const platformEnum = notifSchema.enum('platform', ['ios', 'android']);

export const notifications = notifSchema.table(
  'notifications',
  {
    id:          text('id').primaryKey().default(sql`gen_random_uuid()`),
    clerkUserId: text('clerk_user_id').notNull(),
    title:       text('title').notNull(),
    body:        text('body').notNull(),
    data:        jsonb('data').notNull().default(sql`'{}'`),
    isRead:      boolean('is_read').notNull().default(false),
    createdAt:   timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('notif_user_idx').on(t.clerkUserId),
    readIdx: index('notif_read_idx').on(t.isRead),
  }),
);

export const pushTokens = notifSchema.table('push_tokens', {
  id:          text('id').primaryKey().default(sql`gen_random_uuid()`),
  clerkUserId: text('clerk_user_id').notNull(),
  token:       text('token').notNull().unique(),
  platform:    platformEnum('platform').notNull(),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
  lastSeenAt:  timestamp('last_seen_at').notNull().defaultNow(),
});

export type NotificationInsert = typeof notifications.$inferInsert;
export type PushTokenInsert = typeof pushTokens.$inferInsert;
