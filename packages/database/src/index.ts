import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';

export function createDrizzleClient<TSchema extends Record<string, unknown>>(
  schema: TSchema,
  schemaName?: string,
): NeonHttpDatabase<TSchema> {
  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl) {
    throw new Error('Missing DATABASE_URL environment variable');
  }

  const sql = neon(databaseUrl);
  return drizzle(sql, {
    schema,
    logger: process.env['NODE_ENV'] === 'development',
  });
}

export { sql } from 'drizzle-orm';
export type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
