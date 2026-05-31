import express from 'express';
import helmet from 'helmet';
import { ordersRouter } from './routes/orders.js';

export function createApp(): express.Application {
  const app = express();
  app.use(helmet());
  app.use(express.json());
  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'order-service' }));
  app.use('/api/orders', ordersRouter);
  return app;
}
