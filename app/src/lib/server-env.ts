// SERVER ONLY. Reads secrets at runtime (Vercel env / app/.env in dev) via astro:env.
// Never import this file from client-side scripts.
import { getSecret } from 'astro:env/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** Returns a trimmed env value, or undefined when unset / empty / still a placeholder. */
export function serverEnv(name: string): string | undefined {
  const v = getSecret(name)?.trim();
  if (!v) return undefined;
  if (/^(sk_test_|whsec_|sb_publishable_|sb_secret_)?x{3,}$/i.test(v)) return undefined; // .env.example placeholders
  return v;
}

export function supabaseUrl(): string | undefined {
  return serverEnv('PUBLIC_SUPABASE_URL') ?? (import.meta.env.PUBLIC_SUPABASE_URL as string | undefined);
}

export function supabasePublishableKey(): string | undefined {
  return (
    serverEnv('PUBLIC_SUPABASE_PUBLISHABLE_KEY') ??
    (import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY as string | undefined)
  );
}

/** Base URL for redirects: PUBLIC_SITE_URL, else the request origin. No trailing slash. */
export function siteUrl(request: Request): string {
  const configured = serverEnv('PUBLIC_SITE_URL') ?? (import.meta.env.PUBLIC_SITE_URL as string | undefined);
  const base = configured || new URL(request.url).origin;
  return base.replace(/\/+$/, '');
}

/**
 * Server-side client with the publishable (anon) key. Subject to RLS — used for public
 * form inserts so the database policies, not the server, are the security boundary.
 * Pass an access token to act as that signed-in user.
 */
export function getAnonServerClient(accessToken?: string): SupabaseClient | null {
  const url = supabaseUrl();
  const key = supabasePublishableKey();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  });
}

// ---------------------------------------------------------------------------
// HTTP helpers — one error shape everywhere: { error: string, details?: unknown }
// ---------------------------------------------------------------------------
const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

export function errorJson(error: string, status: number, details?: unknown): Response {
  return json(details === undefined ? { error } : { error, details }, status);
}

const MAX_BODY_BYTES = 16 * 1024;

/** Parses a JSON object body (≤16 KB). Returns null on bad JSON / wrong type / too large. */
export async function readJsonBody(request: Request): Promise<Record<string, unknown> | null> {
  const ct = request.headers.get('content-type') ?? '';
  if (!ct.includes('application/json')) return null;
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return null;
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Tiny validators (no dependency). Each returns the cleaned value or undefined.
// ---------------------------------------------------------------------------
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function str(v: unknown, max: number, { required = false, min = 1 } = {}): string | undefined | null {
  if (v === undefined || v === null || v === '') return required ? undefined : null;
  if (typeof v !== 'string') return undefined;
  const s = v.trim();
  if (s.length < min || s.length > max) return required || s.length > 0 ? undefined : null;
  return s;
}

export function email(v: unknown, required = true): string | undefined | null {
  const s = str(v, 254, { required });
  if (s === null || s === undefined) return s;
  return EMAIL_RE.test(s) ? s.toLowerCase() : undefined;
}

export function oneOf<T extends string>(v: unknown, allowed: readonly T[], required = true): T | undefined | null {
  if ((v === undefined || v === null || v === '') && !required) return null;
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;
}

export function strArray(v: unknown, maxItems: number, maxLen: number): string[] | undefined {
  if (v === undefined || v === null) return [];
  const arr = typeof v === 'string' ? v.split(',') : v;
  if (!Array.isArray(arr) || arr.length > maxItems) return undefined;
  const out: string[] = [];
  for (const item of arr) {
    if (typeof item !== 'string') return undefined;
    const s = item.trim();
    if (!s) continue;
    if (s.length > maxLen) return undefined;
    out.push(s);
  }
  return out;
}

export function httpUrl(v: unknown, required = false): string | undefined | null {
  const s = str(v, 500, { required });
  if (s === null || s === undefined) return s;
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

export const CITY_SLUGS = ['bangkok', 'chiang-mai', 'phuket'] as const;
export const LISTING_KINDS = ['coworking', 'coliving', 'agency', 'insurance', 'esim'] as const;
