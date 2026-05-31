import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripeClient) return stripeClient;
  const secretKey = process.env['STRIPE_SECRET_KEY'];
  if (!secretKey) throw new Error('Missing STRIPE_SECRET_KEY');
  stripeClient = new Stripe(secretKey, { apiVersion: '2024-04-10' });
  return stripeClient;
}

// Lazy singleton exported for easy mocking in tests
export const stripe = {
  get paymentIntents() { return getStripe().paymentIntents; },
  get webhooks() { return getStripe().webhooks; },
};
