import { createDrizzleClient } from '@halalgo/database';
import * as schema from './schema.js';
export const db = createDrizzleClient(schema, 'analytics_schema');
export * from './schema.js';
export { sql } from 'drizzle-orm';
export { desc } from 'drizzle-orm';
