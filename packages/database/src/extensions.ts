import { neon } from '@neondatabase/serverless';

async function enableExtensions(): Promise<void> {
  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl) throw new Error('Missing DATABASE_URL');

  const sql = neon(databaseUrl);

  await sql`CREATE EXTENSION IF NOT EXISTS postgis`;
  await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`;
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

  const schemas = [
    'store_schema',
    'order_schema',
    'driver_schema',
    'payment_schema',
    'customer_schema',
    'notif_schema',
    'analytics_schema',
  ];

  for (const schema of schemas) {
    await sql`CREATE SCHEMA IF NOT EXISTS ${sql(schema)}`;
  }

  console.log('Extensions and schemas created successfully.');
}

enableExtensions().catch(console.error);
