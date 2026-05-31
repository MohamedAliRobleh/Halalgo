import express from 'express';
import helmet from 'helmet';
import { searchRouter } from './routes/search.js';

export function createApp(): express.Application {
  const app = express();
  app.use(helmet());
  app.use(express.json());
  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'search-service' }));
  app.use('/api/search', searchRouter);
  return app;
}
