// SERVER ONLY. Stripe client, or null when STRIPE_SECRET_KEY is not configured.
import Stripe from 'stripe';
import { serverEnv } from './server-env';

let cached: Stripe | null | undefined;

/** Returns a Stripe client, or null if STRIPE_SECRET_KEY is missing. */
export function getStripe(): Stripe | null {
  if (cached !== undefined) return cached;
  const key = serverEnv('STRIPE_SECRET_KEY');
  if (!key) return (cached = null);
  if (!key.startsWith('sk_test_') && !key.startsWith('rk_test_')) {
    // Live keys work too, but log loudly so a demo never charges real cards by accident.
    console.warn('[stripe] Using a non-test key. Real cards will be charged.');
  }
  cached = new Stripe(key, { appInfo: { name: 'longstay-th' } });
  return cached;
}

export function getWebhookSecret(): string | undefined {
  return serverEnv('STRIPE_WEBHOOK_SECRET');
}

export const PAYMENTS_NOT_CONFIGURED = 'payments_not_configured' as const;
