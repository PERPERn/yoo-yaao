// POST /api/lead — "Get expert help" form. Inserted with the publishable key; RLS + column
// grants allow anon INSERT only (no read-back), so the DB is the security boundary.
import type { APIRoute } from 'astro';
import { email, errorJson, getAnonServerClient, json, readJsonBody, str } from '../../lib/server-env';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const body = await readJsonBody(request);
  if (!body) return errorJson('invalid_json', 400);
  if (typeof body.website === 'string' && body.website) return json({ ok: true }, 201); // honeypot

  const row = {
    name: str(body.name, 120, { required: true }),
    email: email(body.email),
    nationality: str(body.nationality, 60),
    visa_slug: str(body.visaSlug, 40),
    city: str(body.city, 60),
    message: str(body.message, 2000),
    source: str(body.source, 120),
  };
  const details: Record<string, string> = {};
  if (!row.name) details.name = 'Required, 1–120 characters';
  if (!row.email) details.email = 'A valid email is required';
  if (row.nationality === undefined) details.nationality = 'Max 60 characters';
  if (row.visa_slug === undefined) details.visaSlug = 'Max 40 characters';
  if (row.city === undefined) details.city = 'Max 60 characters';
  if (row.message === undefined) details.message = 'Max 2000 characters';
  if (row.source === undefined) details.source = 'Max 120 characters';
  if (Object.keys(details).length) return errorJson('validation_failed', 422, details);

  const sb = getAnonServerClient();
  if (!sb) return errorJson('database_not_configured', 503);
  const { error } = await sb.from('leads').insert(row);
  if (error) {
    console.error('[lead] insert failed', error.code, error.message);
    return errorJson('db_error', 500);
  }
  return json({ ok: true }, 201);
};
