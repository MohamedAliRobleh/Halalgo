import type { Request, Response } from 'express';
import { stripe } from '../stripe/client.js';
import { db, transactions } from '../db/index.js';
import { cadToCents } from '@halalgo/utils';
import { z } from 'zod';

export const createIntentSchema = z.object({
  orderId:  z.string().min(1),
  amount:   z.number().positive(),
  currency: z.enum(['cad']).default('cad'),
});

const PLATFORM_FEE_RATE = 0.20;

export async function createPaymentIntent(req: Request, res: Response): Promise<void> {
  const { orderId, amount, currency } = req.body as z.infer<typeof createIntentSchema>;
  const amountCents = cadToCents(amount);
  const platformFeeCents = Math.round(amountCents * PLATFORM_FEE_RATE);

  const intent = await stripe.paymentIntents.create({
    amount:   amountCents,
    currency,
    metadata: { orderId },
    application_fee_amount: platformFeeCents,
  });

  await db.insert(transactions).values({
    orderId,
    stripePaymentIntentId: intent.id,
    amount:       String(amount),
    status:       'pending',
    platformFee:  String(amount * PLATFORM_FEE_RATE),
    storePayout:  String(amount * 0.80),
    driverPayout: '0',
  });

  res.status(201).json({
    clientSecret:    intent.client_secret,
    paymentIntentId: intent.id,
  });
}
