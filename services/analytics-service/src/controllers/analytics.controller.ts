import type { Request, Response } from 'express';
import { db } from '../db/index.js';
import { sql } from '@halalgo/database';

interface DailyRevenueRow extends Record<string, unknown> {
  date: string;
  total_revenue: string;
  platform_fees: string;
  order_count: number;
}

interface HourlyOrderRow extends Record<string, unknown> {
  date: string;
  hour: number;
  order_count: number;
}

export async function getDashboard(_req: Request, res: Response): Promise<void> {
  const revenueResult = await db.execute<DailyRevenueRow>(sql`
    SELECT date, total_revenue, platform_fees, order_count
    FROM analytics_schema.daily_revenue
    ORDER BY date DESC
    LIMIT 1
  `);

  const hourlyResult = await db.execute<HourlyOrderRow>(sql`
    SELECT date, hour, order_count
    FROM analytics_schema.hourly_orders
    ORDER BY date DESC, hour DESC
    LIMIT 24
  `);

  const todayRevenue = revenueResult.rows[0];
  const hourlyData = hourlyResult.rows;

  res.json({
    revenue: {
      today:      todayRevenue?.total_revenue ?? '0',
      orderCount: todayRevenue?.order_count ?? 0,
    },
    orders: {
      hourly: hourlyData,
    },
  });
}

export async function getRevenueTrend(req: Request, res: Response): Promise<void> {
  const days = parseInt((req.query['days'] as string) ?? '7', 10);
  const result = await db.execute<DailyRevenueRow>(sql`
    SELECT date, total_revenue, platform_fees, order_count
    FROM analytics_schema.daily_revenue
    ORDER BY date DESC
    LIMIT ${days}
  `);
  const data = [...result.rows].reverse();
  res.json({ data });
}
