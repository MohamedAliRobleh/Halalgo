import { createDrizzleClient } from '@halalgo/database';
import * as schema from './schema.js';

export const db = createDrizzleClient(schema, 'order_schema');
export * from './schema.js';
