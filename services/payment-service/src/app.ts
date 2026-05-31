import express from 'express';
import helmet from 'helmet';
import { intentsRouter } from './routes/intents.js';
import { webhookRouter } from './routes/webhook.js';

export function createApp(): express.Application {
  const app = express();
  app.use(helmet());

  // Stripe webhook needs raw body — mount BEFORE json middleware
  app.use('/api/stripe', webhookRouter);

  app.use(express.json());
  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'payment-service' }));
  app.use('/api/payments', intentsRouter);

  return app;
}
