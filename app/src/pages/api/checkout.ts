// POST /api/checkout — creates a Stripe Checkout Session (USD) and returns { url }.
import type { APIRoute } from 'astro';
import type { Buddy, ProductId } from '../../types/contracts';
import { getProduct, PLATFORM_FEE_RATE } from '../../data/products';
import { getStripe, PAYMENTS_NOT_CONFIGURED } from '../../lib/stripe';
import {
  CITY_SLUGS,
  LISTING_KINDS,
  email as vEmail,
  errorJson,
  getAnonServerClient,
  json,
  oneOf,
  readJsonBody,
  siteUrl,
  str,
} from '../../lib/server-env';

export const prerender = false;

const PRODUCT_IDS: readonly ProductId[] = ['pro_monthly', 'pro_yearly', 'listing_featured', 'buddy_session'];
const BUDDY_MIN_USD = 10;
const BUDDY_MAX_USD = 200;

// If the content agent ships src/data/buddies.ts (export const buddies: Buddy[]), the buddy
// price is taken from there (server-side) instead of trusting the client's priceUsd.
const buddyModules = import.meta.glob<{ buddies?: Buddy[] }>('../../data/buddies.ts', { eager: true });
const knownBuddies: Buddy[] | null = Object.values(buddyModules)[0]?.buddies ?? null;

const round2 = (n: number) => Math.round(n * 100) / 100;

async function userFromBearer(request: Request): Promise<{ id: string; email: string | null } | null> {
  const auth = request.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) return null;
  const sb = getAnonServerClient();
  if (!sb) return null;
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}

export const POST: APIRoute = async ({ request }) => {
  const stripe = getStripe();
  if (!stripe) return errorJson(PAYMENTS_NOT_CONFIGURED, 503);

  const body = await readJsonBody(request);
  if (!body) return errorJson('invalid_json', 400);

  const details: Record<string, string> = {};
  const productId = oneOf(body.productId, PRODUCT_IDS);
  if (!productId) details.productId = 'Must be one of ' + PRODUCT_IDS.join(', ');
  const bodyEmail = vEmail(body.email, false);
  if (bodyEmail === undefined) details.email = 'Invalid email';
  if (Object.keys(details).length || !productId) return errorJson('validation_failed', 422, details);

  const product = getProduct(productId);
  if (!product) return errorJson('unknown_product', 422);

  // Optional: a signed-in user sends Authorization: Bearer <supabase access token>.
  const user = await userFromBearer(request);
  const customerEmail = user?.email ?? bodyEmail ?? undefined;

  let unitUsd = product.priceUsd;
  const metadata: Record<string, string> = {
    productId,
    segment: product.segment,
  };
  if (user) metadata.userId = user.id;
  if (customerEmail) metadata.email = customerEmail;

  let lineName = product.name;
  let description: string | undefined = product.features[0];

  if (productId === 'buddy_session') {
    const buddyId = str(body.buddyId, 64, { required: true });
    if (!buddyId || !/^[a-z0-9][a-z0-9_-]*$/i.test(buddyId)) {
      return errorJson('validation_failed', 422, { buddyId: 'Required (letters, digits, - or _)' });
    }
    if (knownBuddies) {
      const buddy = knownBuddies.find((b) => b.id === buddyId);
      if (!buddy) return errorJson('validation_failed', 422, { buddyId: 'Unknown buddy' });
      unitUsd = buddy.priceUsd;
      lineName = `${product.name} with ${buddy.displayName}`;
    } else if (body.priceUsd !== undefined) {
      const p = Number(body.priceUsd);
      if (!Number.isFinite(p) || p < BUDDY_MIN_USD || p > BUDDY_MAX_USD) {
        return errorJson('validation_failed', 422, { priceUsd: `Must be between ${BUDDY_MIN_USD} and ${BUDDY_MAX_USD}` });
      }
      unitUsd = round2(p);
    }
    const sessionAt = str(body.sessionAt, 40);
    if (sessionAt === undefined || (sessionAt && Number.isNaN(Date.parse(sessionAt)))) {
      return errorJson('validation_failed', 422, { sessionAt: 'Must be an ISO date-time' });
    }
    const fee = round2(unitUsd * PLATFORM_FEE_RATE);
    metadata.buddyId = buddyId;
    metadata.amountUsd = unitUsd.toFixed(2);
    metadata.platformFeeUsd = fee.toFixed(2);
    metadata.platformFeeRate = String(PLATFORM_FEE_RATE);
    if (sessionAt) metadata.sessionAt = new Date(sessionAt).toISOString();
    description = `Includes ${Math.round(PLATFORM_FEE_RATE * 100)}% platform fee ($${fee.toFixed(2)})`;
  }

  if (productId === 'listing_featured') {
    const listingName = str(body.listingName, 120, { required: true });
    const listingKind = oneOf(body.listingKind, LISTING_KINDS, false);
    const listingCity = oneOf(body.listingCity, CITY_SLUGS, false);
    const errs: Record<string, string> = {};
    if (!listingName) errs.listingName = 'Required, 1–120 characters';
    if (listingKind === undefined) errs.listingKind = 'Must be one of ' + LISTING_KINDS.join(', ');
    if (listingCity === undefined) errs.listingCity = 'Must be one of ' + CITY_SLUGS.join(', ');
    if (Object.keys(errs).length || !listingName) return errorJson('validation_failed', 422, errs);
    metadata.listingName = listingName;
    if (listingKind) metadata.listingKind = listingKind;
    if (listingCity) metadata.listingCity = listingCity;
    lineName = `${product.name}: ${listingName}`;
  }

  const unitAmount = Math.round(unitUsd * 100);
  const base = siteUrl(request);
  const isSubscription = Boolean(product.interval);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: isSubscription ? 'subscription' : 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: unitAmount,
            product_data: description ? { name: lineName, description } : { name: lineName },
            ...(isSubscription ? { recurring: { interval: product.interval! } } : {}),
          },
        },
      ],
      ...(customerEmail ? { customer_email: customerEmail } : {}),
      ...(user ? { client_reference_id: user.id } : {}),
      metadata,
      ...(isSubscription
        ? { subscription_data: { metadata } }
        : { payment_intent_data: { metadata }, customer_creation: 'always' as const }),
      success_url: `${base}/checkout/status?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/checkout/status?session_id={CHECKOUT_SESSION_ID}&cancelled=1`,
    });
    if (!session.url) return errorJson('checkout_failed', 502);
    return json({ url: session.url, id: session.id });
  } catch (err) {
    console.error('[checkout] Stripe error', err instanceof Error ? err.message : err);
    return errorJson('checkout_failed', 502);
  }
};
