// GET /api/revenue — aggregate revenue by segment for the demo dashboard.
// Returns totals only (no emails / ids). Admins only (Bearer = Supabase access token); everyone else
// gets the same empty "not configured" shape, so public pages fall back to their labelled sample data.
import type { APIRoute } from 'astro';
import { getSupabaseAdmin, isAdminConfigured } from '../../lib/supabase-admin';
import { errorJson, json } from '../../lib/server-env';

export const prerender = false;

type Bucket = { grossUsd: number; netUsd: number; count: number };
const SEGMENTS = ['B2C', 'B2B', 'C2C'] as const;
const PRODUCTS = ['pro_monthly', 'pro_yearly', 'listing_featured', 'buddy_session'] as const;

const empty = (): Bucket => ({ grossUsd: 0, netUsd: 0, count: 0 });
const r2 = (n: number) => Math.round(n * 100) / 100;

function blank() {
  return {
    total: empty(),
    bySegment: Object.fromEntries(SEGMENTS.map((s) => [s, empty()])) as Record<(typeof SEGMENTS)[number], Bucket>,
    byProduct: Object.fromEntries(PRODUCTS.map((p) => [p, empty()])) as Record<(typeof PRODUCTS)[number], Bucket>,
    recent: [] as { productId: string; segment: string; amountUsd: number; netUsd: number; createdAt: string }[],
  };
}

async function isAdminRequest(request: Request): Promise<boolean> {
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return false;
  const db = getSupabaseAdmin();
  const { data: user } = await db.auth.getUser(token);
  if (!user.user) return false;
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.user.id).maybeSingle();
  return profile?.role === 'admin';
}

export const GET: APIRoute = async ({ request }) => {
  const out = blank();
  if (!isAdminConfigured() || !(await isAdminRequest(request))) {
    return json({ configured: false, currency: 'usd', ...out, updatedAt: new Date().toISOString() });
  }

  const { data, error } = await getSupabaseAdmin()
    .from('payments')
    .select('product_id, segment, amount_usd, net_revenue_usd, created_at')
    .eq('status', 'paid')
    .order('created_at', { ascending: false })
    .limit(10000);
  if (error) {
    console.error('[revenue] query failed', error.message);
    return errorJson('db_error', 500);
  }

  for (const row of data ?? []) {
    const gross = Number(row.amount_usd) || 0;
    const net = Number(row.net_revenue_usd) || 0;
    for (const b of [
      out.total,
      out.bySegment[row.segment as (typeof SEGMENTS)[number]],
      out.byProduct[row.product_id as (typeof PRODUCTS)[number]],
    ]) {
      if (!b) continue;
      b.grossUsd += gross;
      b.netUsd += net;
      b.count += 1;
    }
    if (out.recent.length < 10) {
      out.recent.push({ productId: row.product_id, segment: row.segment, amountUsd: gross, netUsd: net, createdAt: row.created_at });
    }
  }
  for (const b of [out.total, ...Object.values(out.bySegment), ...Object.values(out.byProduct)]) {
    b.grossUsd = r2(b.grossUsd);
    b.netUsd = r2(b.netUsd);
  }

  return json({ configured: true, currency: 'usd', ...out, updatedAt: new Date().toISOString() });
};
