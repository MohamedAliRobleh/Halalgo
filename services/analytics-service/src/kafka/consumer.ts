import { createConsumer, KAFKA_TOPICS } from '@halalgo/kafka';
import { db } from '../db/index.js';
import { sql } from '@halalgo/database';
import type { KafkaEvent, OrderCompletedPayload } from '@halalgo/types';

function todayDate(): string {
  return new Date().toISOString().split('T')[0]!;
}

function currentHour(): number {
  return new Date().getHours();
}

async function upsertDailyRevenue(amount: number): Promise<void> {
  const today = todayDate();
  const platformFee = amount * 0.20;
  await db.execute(sql`
    INSERT INTO analytics_schema.daily_revenue (date, total_revenue, platform_fees, order_count)
    VALUES (${today}, ${amount}, ${platformFee}, 1)
    ON CONFLICT (date) DO UPDATE SET
      total_revenue = daily_revenue.total_revenue + ${amount},
      platform_fees = daily_revenue.platform_fees + ${platformFee},
      order_count   = daily_revenue.order_count + 1,
      updated_at    = NOW()
  `);
}

async function upsertStoreRevenue(storeId: string, amount: number): Promise<void> {
  const today = todayDate();
  await db.execute(sql`
    INSERT INTO analytics_schema.store_revenue (store_id, date, total_revenue, order_count)
    VALUES (${storeId}, ${today}, ${amount}, 1)
    ON CONFLICT (store_id, date) DO UPDATE SET
      total_revenue = store_revenue.total_revenue + ${amount},
      order_count   = store_revenue.order_count + 1,
      updated_at    = NOW()
  `);
}

async function upsertHourlyOrder(): Promise<void> {
  const today = todayDate();
  const hour = currentHour();
  await db.execute(sql`
    INSERT INTO analytics_schema.hourly_orders (date, hour, order_count)
    VALUES (${today}, ${hour}, 1)
    ON CONFLICT (date, hour) DO UPDATE SET
      order_count = hourly_orders.order_count + 1
  `);
}

export async function startAnalyticsConsumer(): Promise<void> {
  await createConsumer(
    [KAFKA_TOPICS.ORDER_COMPLETED],
    async (event: KafkaEvent<unknown>) => {
      const payload = event.payload as OrderCompletedPayload;
      await Promise.all([
        upsertDailyRevenue(payload.total),
        upsertStoreRevenue(payload.storeId, payload.subtotal * 0.80),
        upsertHourlyOrder(),
      ]);
    },
  );
}
