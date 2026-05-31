import express from 'express';
import helmet from 'helmet';
import { driversRouter } from './routes/drivers.js';

export function createApp(): express.Application {
  const app = express();
  app.use(helmet());
  app.use(express.json());
  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'driver-service' }));
  app.use('/api/drivers', driversRouter);
  return app;
}
