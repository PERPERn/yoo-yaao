// POST /api/listing-apply — a business applies for a (featured) listing (B2B).
import type { APIRoute } from 'astro';
import {
  CITY_SLUGS,
  LISTING_KINDS,
  email,
  errorJson,
  getAnonServerClient,
  httpUrl,
  json,
  oneOf,
  readJsonBody,
  str,
} from '../../lib/server-env';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const body = await readJsonBody(request);
  if (!body) return errorJson('invalid_json', 400);
  if (typeof body.website === 'string' && body.website) return json({ ok: true }, 201); // honeypot

  const row = {
    business_name: str(body.businessName, 120, { required: true }),
    kind: oneOf(body.kind, LISTING_KINDS),
    city: oneOf(body.city, CITY_SLUGS, false),
    url: httpUrl(body.url),
    contact_name: str(body.contactName, 120),
    email: email(body.email),
    message: str(body.message, 2000),
    license_no: str(body.licenseNo, 80),
  };
  const details: Record<string, string> = {};
  if (!row.business_name) details.businessName = 'Required, 1–120 characters';
  if (!row.kind) details.kind = 'Must be one of ' + LISTING_KINDS.join(', ');
  if (row.city === undefined) details.city = 'Must be one of ' + CITY_SLUGS.join(', ');
  if (row.url === undefined) details.url = 'Must be an http(s) URL';
  if (row.contact_name === undefined) details.contactName = 'Max 120 characters';
  if (!row.email) details.email = 'A valid email is required';
  if (row.message === undefined) details.message = 'Max 2000 characters';
  if (row.license_no === undefined) details.licenseNo = 'Max 80 characters';
  if (row.kind === 'agency' && !row.license_no) details.licenseNo = 'Agencies need a DBD registration or Lawyers Council licence number';
  if (Object.keys(details).length) return errorJson('validation_failed', 422, details);

  const sb = getAnonServerClient();
  if (!sb) return errorJson('database_not_configured', 503);
  const { error } = await sb.from('listing_applications').insert(row);
  if (error) {
    console.error('[listing-apply] insert failed', error.code, error.message);
    return errorJson('db_error', 500);
  }
  return json({ ok: true }, 201);
};
