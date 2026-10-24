// POST /api/buddy-apply — a local applies to become a Local Buddy (C2C supply side).
import type { APIRoute } from 'astro';
import { CITY_SLUGS, email, errorJson, getAnonServerClient, json, oneOf, readJsonBody, str, strArray } from '../../lib/server-env';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const body = await readJsonBody(request);
  if (!body) return errorJson('invalid_json', 400);
  if (typeof body.website === 'string' && body.website) return json({ ok: true }, 201); // honeypot

  let price: number | null | undefined = null;
  if (body.priceUsd !== undefined && body.priceUsd !== null && body.priceUsd !== '') {
    const p = Number(body.priceUsd);
    price = Number.isFinite(p) && p >= 10 && p <= 200 ? Math.round(p * 100) / 100 : undefined;
  }
  const row = {
    full_name: str(body.fullName, 120, { required: true }),
    email: email(body.email),
    city: oneOf(body.city, CITY_SLUGS),
    languages: strArray(body.languages, 10, 40),
    services: strArray(body.services, 15, 80),
    bio: str(body.bio, 2000),
    price_usd: price,
  };
  const details: Record<string, string> = {};
  if (!row.full_name) details.fullName = 'Required, 1–120 characters';
  if (!row.email) details.email = 'A valid email is required';
  if (!row.city) details.city = 'Must be one of ' + CITY_SLUGS.join(', ');
  if (!row.languages) details.languages = 'Up to 10 items, 40 characters each';
  if (!row.services) details.services = 'Up to 15 items, 80 characters each';
  if (row.bio === undefined) details.bio = 'Max 2000 characters';
  if (row.price_usd === undefined) details.priceUsd = 'Must be a number between 10 and 200';
  if (Object.keys(details).length) return errorJson('validation_failed', 422, details);

  const sb = getAnonServerClient();
  if (!sb) return errorJson('database_not_configured', 503);
  const { error } = await sb.from('buddy_applications').insert(row);
  if (error) {
    console.error('[buddy-apply] insert failed', error.code, error.message);
    return errorJson('db_error', 500);
  }
  return json({ ok: true }, 201);
};
