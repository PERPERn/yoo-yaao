// SERVER ONLY. Service-role client: bypasses RLS. Use only inside src/pages/api/**.
// Never import this file from a page script or component that runs in the browser.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { serverEnv, supabaseUrl } from './server-env';

export class AdminNotConfiguredError extends Error {
  constructor() {
    super(
      'SUPABASE_SERVICE_ROLE_KEY is not set. Add the Supabase secret key (Dashboard → Project Settings → API Keys → Secret keys) to app/.env and to the Vercel project env.',
    );
    this.name = 'AdminNotConfiguredError';
  }
}

let cached: SupabaseClient | null = null;

export function isAdminConfigured(): boolean {
  return Boolean(supabaseUrl() && serverEnv('SUPABASE_SERVICE_ROLE_KEY'));
}

/** Returns the service-role client. Throws AdminNotConfiguredError when the key or URL is missing. */
export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  const url = supabaseUrl();
  const key = serverEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new AdminNotConfiguredError();
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return cached;
}
