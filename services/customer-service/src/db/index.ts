import { createDrizzleClient } from '@halalgo/database';
import * as schema from './schema.js';
export const db = createDrizzleClient(schema, 'customer_schema');
export * from './schema.js';
