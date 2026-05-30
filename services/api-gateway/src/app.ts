import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { healthRouter } from './routes/health.js';
import { proxyRouter } from './routes/proxy.js';
import { globalRateLimit } from './middleware/rateLimit.js';

export function createApp(): express.Application {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: process.env['ALLOWED_ORIGINS']?.split(',') ?? '*' }));
  app.use(express.json({ limit: '10mb' }));
  app.use(globalRateLimit);

  app.use('/health', healthRouter);
  app.use('/', proxyRouter);

  return app;
}
