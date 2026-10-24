// POST /api/stripe-webhook — Stripe → our DB. Verifies the signature against the RAW body.
// Every write is idempotent (keyed on the Checkout Session id), so Stripe retries are safe.
import type { APIRoute } from 'astro';
import type { ProductId } from '../../types/contracts';
import { getProduct, PLATFORM_FEE_RATE } from '../../data/products';
import { getStripe, getWebhookSecret, PAYMENTS_NOT_CONFIGURED } from '../../lib/stripe';
import { getSupabaseAdmin, isAdminConfigured } from '../../lib/supabase-admin';
import { CITY_SLUGS, LISTING_KINDS, errorJson, json } from '../../lib/server-env';

export const prerender = false;

const PRODUCT_IDS: readonly string[] = ['pro_monthly', 'pro_yearly', 'listing_featured', 'buddy_session'];
const HANDLED = new Set(['checkout.session.completed', 'checkout.session.async_payment_succeeded']);

const round2 = (n: number) => Math.round(n * 100) / 100;

function addInterval(fromMs: number, interval: 'month' | 'year'): Date {
  const d = new Date(fromMs);
  if (interval === 'year') d.setUTCFullYear(d.getUTCFullYear() + 1);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return d;
}

// The subset of a Checkout Session we read. Stripe data is untrusted input → validated below.
type CheckoutSessionLike = {
  id: string;
  created: number;
  amount_total: number | null;
  currency: string | null;
  payment_status: string;
  customer: string | { id: string } | null;
  customer_email: string | null;
  customer_details: { email: string | null } | null;
  client_reference_id: string | null;
  metadata: Record<string, string> | null;
};

export const POST: APIRoute = async ({ request }) => {
  const stripe = getStripe();
  const secret = getWebhookSecret();
  if (!stripe || !secret) return errorJson(PAYMENTS_NOT_CONFIGURED, 503);

  const signature = request.headers.get('stripe-signature');
  if (!signature) return errorJson('missing_signature', 400);

  const rawBody = await request.text();
  let event: { type: string; data: { object: unknown } };
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, secret);
  } catch (err) {
    console.warn('[stripe-webhook] signature verification failed', err instanceof Error ? err.message : err);
    return errorJson('invalid_signature', 400);
  }

  if (!HANDLED.has(event.type)) return json({ received: true, ignored: event.type });

  // Without the service role we cannot record anything: 503 makes Stripe retry later.
  if (!isAdminConfigured()) return errorJson('database_not_configured', 503);
  const db = getSupabaseAdmin();

  const s = event.data.object as CheckoutSessionLike;
  if (s.payment_status !== 'paid' && s.payment_status !== 'no_payment_required') {
    // e.g. delayed payment methods; the async_payment_succeeded event will follow.
    return json({ received: true, pending: true });
  }

  const md = s.metadata ?? {};
  const productId = md.productId;
  if (!productId || !PRODUCT_IDS.includes(productId)) {
    console.warn('[stripe-webhook] session without a known productId', s.id);
    return json({ received: true, ignored: 'unknown_product' });
  }
  const product = getProduct(productId as ProductId)!;
  const amountUsd = round2((s.amount_total ?? 0) / 100);
  const email = (s.customer_details?.email ?? s.customer_email ?? md.email ?? null)?.toLowerCase() ?? null;
  const createdMs = s.created * 1000;
  const customerId = typeof s.customer === 'string' ? s.customer : s.customer?.id ?? null;

  // Resolve the profile: explicit user id from checkout, else match by email.
  let userId: string | null = md.userId || s.client_reference_id || null;
  if (userId && !/^[0-9a-f-]{36}$/i.test(userId)) userId = null;
  if (!userId && email) {
    const { data } = await db.from('profiles').select('id').eq('email', email).maybeSingle();
    userId = data?.id ?? null;
  }
  if (userId) {
    const { data } = await db.from('profiles').select('id').eq('id', userId).maybeSingle();
    if (!data) userId = null; // FK safety
  }

  const platformFeeUsd = product.segment === 'C2C' ? round2(amountUsd * PLATFORM_FEE_RATE) : 0;
  const netRevenueUsd = product.segment === 'C2C' ? platformFeeUsd : amountUsd;

  // 1) payments — the revenue ledger.
  const { error: payErr } = await db.from('payments').upsert(
    {
      user_id: userId,
      email,
      product_id: productId,
      segment: product.segment,
      amount_usd: amountUsd,
      net_revenue_usd: netRevenueUsd,
      currency: s.currency ?? 'usd',
      stripe_session_id: s.id,
      status: 'paid',
    },
    { onConflict: 'stripe_session_id' },
  );
  if (payErr) {
    console.error('[stripe-webhook] payments upsert failed', payErr.message);
    return errorJson('db_error', 500); // Stripe retries
  }

  // 2) product-specific fulfilment. Dates derive from the session's `created`, so replays are no-ops.
  if (productId === 'pro_monthly' || productId === 'pro_yearly') {
    if (userId) {
      const { data: prof } = await db.from('profiles').select('pro_until').eq('id', userId).single();
      const candidate = addInterval(createdMs, product.interval ?? 'month');
      const existing = prof?.pro_until ? new Date(prof.pro_until as string) : null;
      const proUntil = existing && existing > candidate ? existing : candidate;
      const { error } = await db
        .from('profiles')
        .update({ plan: 'pro', pro_until: proUntil.toISOString(), ...(customerId ? { stripe_customer_id: customerId } : {}) })
        .eq('id', userId);
      if (error) {
        console.error('[stripe-webhook] profile update failed', error.message);
        return errorJson('db_error', 500);
      }
    } else {
      console.warn('[stripe-webhook] Pro paid but no matching profile for', s.id);
    }
  }

  if (productId === 'listing_featured') {
    const name = (md.listingName || 'Featured listing').slice(0, 120);
    const kind = (LISTING_KINDS as readonly string[]).includes(md.listingKind ?? '') ? md.listingKind : 'coworking';
    const city = (CITY_SLUGS as readonly string[]).includes(md.listingCity ?? '') ? md.listingCity : null;
    const ownerEmail = email ?? `unknown+${s.id}@invalid`;
    const { error } = await db.from('listings').upsert(
      {
        name,
        kind,
        city,
        owner_email: ownerEmail,
        featured: true,
        featured_until: addInterval(createdMs, 'month').toISOString(),
        active: true,
      },
      { onConflict: 'owner_email,name' },
    );
    if (error) {
      console.error('[stripe-webhook] listing upsert failed', error.message);
      return errorJson('db_error', 500);
    }
    if (email) {
      await db
        .from('listing_applications')
        .update({ status: 'paid' })
        .eq('email', email)
        .eq('business_name', name)
        .in('status', ['new', 'approved']);
    }
  }

  if (productId === 'buddy_session') {
    const sessionAt = md.sessionAt && !Number.isNaN(Date.parse(md.sessionAt)) ? md.sessionAt : null;
    const { error } = await db.from('bookings').upsert(
      {
        buddy_id: (md.buddyId || 'unknown').slice(0, 64),
        user_id: userId,
        customer_email: email,
        session_at: sessionAt,
        amount_usd: amountUsd,
        platform_fee_usd: platformFeeUsd,
        stripe_session_id: s.id,
        status: 'paid',
      },
      { onConflict: 'stripe_session_id', ignoreDuplicates: true },
    );
    if (error) {
      console.error('[stripe-webhook] booking insert failed', error.message);
      return errorJson('db_error', 500);
    }
  }

  return json({ received: true });
};
