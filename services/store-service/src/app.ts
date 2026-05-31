import express from 'express';
import helmet from 'helmet';
import { storesRouter } from './routes/stores.js';
import { menuRouter } from './routes/menu.js';

export function createApp(): express.Application {
  const app = express();
  app.use(helmet());
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'store-service' }));
  app.use('/api/stores', storesRouter);
  app.use('/api/menu', menuRouter);

  return app;
}
