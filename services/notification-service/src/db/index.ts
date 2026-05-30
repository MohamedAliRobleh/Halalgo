import { createDrizzleClient } from '@halalgo/database';
import * as schema from './schema.js';
export const db = createDrizzleClient(schema, 'notif_schema');
export * from './schema.js';
