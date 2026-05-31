import express from 'express';
import helmet from 'helmet';
import { profilesRouter } from './routes/profiles.js';
import { addressesRouter } from './routes/addresses.js';

export function createApp(): express.Application {
  const app = express();
  app.use(helmet());
  app.use(express.json());
  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'customer-service' }));
  app.use('/api/profile', profilesRouter);
  app.use('/api/addresses', addressesRouter);
  return app;
}
