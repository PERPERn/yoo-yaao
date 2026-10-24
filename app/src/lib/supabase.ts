// Browser Supabase client (publishable key only — safe to ship to the client).
// All data access below is protected by RLS: a user can only see/change their own rows.
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
const key = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/** null when the public env vars are missing (UI should show a "sign-in unavailable" state). */
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' },
      })
    : null;

function client(): SupabaseClient {
  if (!supabase) throw new Error('Supabase is not configured (PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_PUBLISHABLE_KEY).');
  return supabase;
}

// ---------------------------------------------------------------------------
// Types (camelCase for the UI; DB columns are snake_case)
// ---------------------------------------------------------------------------
export type Profile = {
  id: string;
  email: string | null;
  plan: 'free' | 'pro';
  proUntil: string | null;
  isPro: boolean; // plan === 'pro' and pro_until in the future (or unset)
};

export type StayInput = {
  id?: string;               // pass to update an existing stay
  visaType: string;          // e.g. 'dtv' (VisaSlug) or free text
  entryDate: string;         // 'YYYY-MM-DD'
  expiryDate?: string | null;
  lastReportDate?: string | null; // last 90-day report
  city?: string | null;
  note?: string | null;
};

export type Stay = Required<Omit<StayInput, 'id'>> & { id: string; createdAt: string; updatedAt: string };

export type ChecklistItem = { id: string; visaSlug: string; item: string; done: boolean; updatedAt: string };

type StayRow = {
  id: string;
  visa_type: string;
  entry_date: string;
  expiry_date: string | null;
  last_report_date: string | null;
  city: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

type ChecklistRow = { id: string; visa_slug: string; item: string; done: boolean; updated_at: string };

const STAY_COLS = 'id, visa_type, entry_date, expiry_date, last_report_date, city, note, created_at, updated_at';

function toStay(r: StayRow): Stay {
  return {
    id: r.id,
    visaType: r.visa_type,
    entryDate: r.entry_date,
    expiryDate: r.expiry_date,
    lastReportDate: r.last_report_date,
    city: r.city,
    note: r.note,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function toChecklist(r: ChecklistRow): ChecklistItem {
  return { id: r.id, visaSlug: r.visa_slug, item: r.item, done: r.done, updatedAt: r.updated_at };
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
/** Current session, or null (also null when Supabase is not configured). */
export async function getSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/** Access token for calling our own API (e.g. POST /api/checkout with Authorization: Bearer). */
export async function getAccessToken(): Promise<string | null> {
  return (await getSession())?.access_token ?? null;
}

/**
 * Sends a magic link. `redirectTo` must be listed in Supabase → Auth → URL Configuration.
 * Defaults to `${location.origin}/account`.
 */
export async function signInWithMagicLink(email: string, redirectTo?: string): Promise<void> {
  const target = redirectTo ?? `${window.location.origin}/account`;
  const { error } = await client().auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: target, shouldCreateUser: true },
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** Subscribe to sign-in/out. Returns an unsubscribe function. */
export function onAuthChange(cb: (session: Session | null) => void): () => void {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session));
  return () => data.subscription.unsubscribe();
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------
/** The signed-in user's profile, or null when signed out. */
export async function getProfile(): Promise<Profile | null> {
  const session = await getSession();
  if (!session || !supabase) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, plan, pro_until')
    .eq('id', session.user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const proUntil = data.pro_until as string | null;
  const isPro = data.plan === 'pro' && (!proUntil || new Date(proUntil).getTime() > Date.now());
  return { id: data.id, email: data.email, plan: data.plan, proUntil, isPro };
}

// ---------------------------------------------------------------------------
// Stays
// ---------------------------------------------------------------------------
/** Creates (no id) or updates (with id) one of the user's stays. Requires sign-in. */
export async function saveStay(input: StayInput): Promise<Stay> {
  const row = {
    visa_type: input.visaType,
    entry_date: input.entryDate,
    expiry_date: input.expiryDate ?? null,
    last_report_date: input.lastReportDate ?? null,
    city: input.city ?? null,
    note: input.note ?? null,
  };
  const q = input.id
    ? client().from('stays').update(row).eq('id', input.id)
    : client().from('stays').insert(row);
  const { data, error } = await q.select(STAY_COLS).single();
  if (error) throw error;
  return toStay(data as StayRow);
}

/** The user's stays, newest entry first. Empty array when signed out. */
export async function listStays(): Promise<Stay[]> {
  if (!(await getSession())) return [];
  const { data, error } = await client().from('stays').select(STAY_COLS).order('entry_date', { ascending: false });
  if (error) throw error;
  return (data as StayRow[]).map(toStay);
}

export async function deleteStay(id: string): Promise<void> {
  const { error } = await client().from('stays').delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Checklist
// ---------------------------------------------------------------------------
/** Sets one checklist item done/undone (upsert on user + visa + item). Requires sign-in. */
export async function toggleChecklistItem(visaSlug: string, item: string, done: boolean): Promise<ChecklistItem> {
  const session = await getSession();
  if (!session) throw new Error('Sign in to sync your checklist.');
  const { data, error } = await client()
    .from('checklist_items')
    .upsert(
      { user_id: session.user.id, visa_slug: visaSlug, item, done },
      { onConflict: 'user_id,visa_slug,item' },
    )
    .select('id, visa_slug, item, done, updated_at')
    .single();
  if (error) throw error;
  return toChecklist(data as ChecklistRow);
}

/** All checklist items for a visa (or every visa when omitted). Empty when signed out. */
export async function listChecklist(visaSlug?: string): Promise<ChecklistItem[]> {
  if (!(await getSession())) return [];
  let q = client().from('checklist_items').select('id, visa_slug, item, done, updated_at');
  if (visaSlug) q = q.eq('visa_slug', visaSlug);
  const { data, error } = await q;
  if (error) throw error;
  return (data as ChecklistRow[]).map(toChecklist);
}
