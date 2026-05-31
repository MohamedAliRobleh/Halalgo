import { Router } from 'express';
import express from 'express';
import { handleStripeWebhook } from '../controllers/webhook.controller.js';

export const webhookRouter = Router();
// Raw body required for Stripe signature verification — mounted BEFORE json middleware
webhookRouter.post('/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);
