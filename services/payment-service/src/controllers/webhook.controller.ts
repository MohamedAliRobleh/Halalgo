import type { Request, Response } from 'express';
import { getStripe } from '../stripe/client.js';
import { db, transactions } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { publishEvent, KAFKA_TOPICS } from '@halalgo/kafka';

export async function handleStripeWebhook(req: Request, res: Response): Promise<void> {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env['STRIPE_WEBHOOK_SECRET'];

  if (!webhookSecret) {
    res.status(500).json({ error: 'Missing STRIPE_WEBHOOK_SECRET' });
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: any;

  try {
    event = getStripe().webhooks.constructEvent(req.body as Buffer, sig, webhookSecret);
  } catch {
    res.status(400).json({ error: 'Invalid webhook signature' });
    return;
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object as { id: string; metadata: { orderId: string }; amount: number };
    const orderId = intent.metadata['orderId'] ?? '';

    await db
      .update(transactions)
      .set({ status: 'succeeded' })
      .where(eq(transactions.stripePaymentIntentId, intent.id));

    await publishEvent(KAFKA_TOPICS.PAYMENT_COMPLETED, {
      orderId,
      stripePaymentIntentId: intent.id,
      amount: intent.amount / 100,
      clerkCustomerId: '',
    });
  }

  res.json({ received: true });
}
