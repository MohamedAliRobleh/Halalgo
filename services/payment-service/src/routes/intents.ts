import { Router } from 'express';
import { createPaymentIntent, createIntentSchema } from '../controllers/intents.controller.js';
import { validate } from '../middleware/validate.js';

export const intentsRouter = Router();
intentsRouter.post('/create-intent', validate(createIntentSchema), createPaymentIntent);
