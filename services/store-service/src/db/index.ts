import { createDrizzleClient } from '@halalgo/database';
import * as schema from './schema.js';

export const db = createDrizzleClient(schema, 'store_schema');
export * from './schema.js';
