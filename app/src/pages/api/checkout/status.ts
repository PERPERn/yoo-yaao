// GET /api/checkout/status?session_id=cs_… — read-only payment status for the /checkout/status page.
// Returns only non-sensitive fields (no email, customer, or metadata beyond productId).
import type { APIRoute } from 'astro';
import type { ProductId } from '../../../types/contracts';
import { getStripe, PAYMENTS_NOT_CONFIGURED } from '../../../lib/stripe';
import { errorJson, json } from '../../../lib/server-env';

export const prerender = false;

const PRODUCT_IDS: readonly string[] = ['pro_monthly', 'pro_yearly', 'listing_featured', 'buddy_session'];
const SESSION_ID_RE = /^cs_(test|live)_[A-Za-z0-9]{8,200}$/;

export type CheckoutStatus = {
  status: 'processing' | 'paid' | 'expired';
  productId: ProductId | null;
  amountUsd: number | null;
  currency: string | null;
  createdAt: string;
};

const noStore = (r: Response) => (r.headers.set('cache-control', 'no-store'), r);

export const GET: APIRoute = async ({ url }) => {
  const id = url.searchParams.get('session_id') ?? '';
  if (!SESSION_ID_RE.test(id)) return noStore(errorJson('validation_failed', 422, { session_id: 'Must look like cs_test_…' }));

  const stripe = getStripe();
  if (!stripe) return noStore(errorJson(PAYMENTS_NOT_CONFIGURED, 503));

  try {
    const s = await stripe.checkout.sessions.retrieve(id);
    const paid = s.status === 'complete' && (s.payment_status === 'paid' || s.payment_status === 'no_payment_required');
    const md = s.metadata?.productId;
    const body: CheckoutStatus = {
      // 'open' or complete-but-unpaid (delayed methods) both mean "keep polling".
      status: paid ? 'paid' : s.status === 'expired' ? 'expired' : 'processing',
      productId: md && PRODUCT_IDS.includes(md) ? (md as ProductId) : null,
      amountUsd: typeof s.amount_total === 'number' ? s.amount_total / 100 : null,
      currency: s.currency ?? null,
      createdAt: new Date(s.created * 1000).toISOString(),
    };
    return noStore(json(body));
  } catch (err) {
    const code = (err as { code?: string; statusCode?: number })?.code;
    if (code === 'resource_missing' || (err as { statusCode?: number })?.statusCode === 404) {
      return noStore(errorJson('not_found', 404));
    }
    console.error('[checkout-status] Stripe error', err instanceof Error ? err.message : err);
    return noStore(errorJson('status_unavailable', 502));
  }
};
