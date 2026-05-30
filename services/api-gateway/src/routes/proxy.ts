import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { requireAuth } from '../middleware/auth.js';

const SERVICE_URLS: Record<string, string> = {
  stores:        process.env['STORE_SERVICE_URL']        ?? 'http://localhost:3001',
  orders:        process.env['ORDER_SERVICE_URL']        ?? 'http://localhost:3002',
  drivers:       process.env['DRIVER_SERVICE_URL']       ?? 'http://localhost:3003',
  payments:      process.env['PAYMENT_SERVICE_URL']      ?? 'http://localhost:3004',
  notifications: process.env['NOTIFICATION_SERVICE_URL'] ?? 'http://localhost:3005',
  search:        process.env['SEARCH_SERVICE_URL']       ?? 'http://localhost:3006',
  analytics:     process.env['ANALYTICS_SERVICE_URL']    ?? 'http://localhost:3007',
};

export function createProxyRouter(): Router {
  const router = Router();

  for (const [path, target] of Object.entries(SERVICE_URLS)) {
    router.use(
      `/api/${path}`,
      requireAuth,
      createProxyMiddleware({
        target,
        changeOrigin: true,
        pathRewrite: { [`^/api/${path}`]: `/api/${path}` },
      }),
    );
  }

  return router;
}

export const proxyRouter = createProxyRouter();
