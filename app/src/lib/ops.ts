// Partner portal + admin dashboard queries (contract: docs/agency-plan.md).
// Uses the browser client with the user's session; RLS (supabase/migrations/*_partner_admin.sql)
// decides what each caller can read or change. No service-role key here, ever.
// Rows keep the DB's snake_case column names so they match the contract one to one.
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type Role = 'user' | 'partner' | 'admin';
export type LeadStatus = 'new' | 'sent' | 'won' | 'lost' | 'spam' | 'delivered' | 'completed';
export type PartnerLeadStatus = 'sent' | 'won' | 'lost';
export type ListingApplicationStatus = 'new' | 'approved' | 'rejected' | 'paid';
export type BuddyApplicationStatus = 'new' | 'approved' | 'rejected';
export type ApplicationType = 'listing' | 'buddy';
export type CitySlug = 'bangkok' | 'chiang-mai' | 'phuket';
export type ListingKind = 'coworking' | 'coliving' | 'agency' | 'insurance' | 'esim';

/** Same shape as a supabase-js response, so callers handle both the same way. */
export type OpsResult<T> = { data: T | null; error: { message: string } | null };

export type OpsSession = { email: string; role: Role };

export type OpsListing = {
  id: string;
  kind: ListingKind;
  name: string;
  city: CitySlug | null;
  url: string | null;
  price_from: string | null;
  description: string | null;
  affiliate: boolean;
  active: boolean;
  featured: boolean;
  featured_until: string | null;
  created_at: string;
};
/** The only listing fields a partner may change. */
export type ListingPatch = Partial<Pick<OpsListing, 'description' | 'price_from' | 'url'>>;

export type OpsLead = {
  id: string;
  name: string;
  email: string;
  nationality: string | null;
  visa_slug: string | null;
  city: string | null;
  message: string | null;
  source: string | null;
  status: LeadStatus;
  agent_id: string | null;
  assigned_at: string | null;
  created_at: string;
};

export type OpsAgent = { id: string; name: string; company: string | null; cities: string[]; verified: boolean };

export type ListingApplication = {
  id: string;
  business_name: string;
  kind: ListingKind;
  city: CitySlug | null;
  url: string | null;
  contact_name: string | null;
  email: string;
  message: string | null;
  status: ListingApplicationStatus;
  created_at: string;
} & ApplicationReview;

export type BuddyApplication = {
  id: string;
  full_name: string;
  email: string;
  city: CitySlug;
  languages: string[];
  services: string[];
  bio: string | null;
  price_usd: number | null;
  status: BuddyApplicationStatus;
  created_at: string;
} & ApplicationReview;

/** Verification fields on both application tables. license_no comes from the public form; the rest are admin-only. */
export type ApplicationReview = {
  license_no: string | null; // agencies: TAT licence or business registration no.
  verified_identity: boolean;
  verified_license: boolean;
  review_note: string | null;
  reviewed_at: string | null; // set by the DB trigger
  reviewed_by: string | null; // set by the DB trigger (admin's profile id)
};
/** What an admin may change while reviewing. */
export type ReviewPatch = Partial<Pick<ApplicationReview, 'verified_identity' | 'verified_license' | 'review_note'>>;

/** Result of approvePartner (public.approve_partner). */
export type ApprovePartnerResult = {
  email: string;
  account_confirmed: boolean; // applicant has signed in (email confirmed) at least once
  profiles_updated: number;   // 0 = no account yet; they become partner on first sign-in
  listings_linked: number;
  agents_linked: number;
};

export type Applications = { listings: ListingApplication[]; buddies: BuddyApplication[] };

export type OpsBooking = {
  id: string;
  buddy_id: string;
  customer_email: string | null;
  session_at: string | null;
  amount_usd: number;
  platform_fee_usd: number;
  buddy_payout_usd: number;
  status: 'pending' | 'paid' | 'cancelled' | 'refunded';
  created_at: string;
};

export type OpsProfile = {
  id: string;
  email: string | null;
  plan: 'free' | 'pro';
  pro_until: string | null;
  role: Role;
  created_at: string;
};

const LISTING_COLS = 'id, kind, name, city, url, price_from, description, affiliate, active, featured, featured_until, created_at';
const LEAD_COLS = 'id, name, email, nationality, visa_slug, city, message, source, status, agent_id, assigned_at, created_at';
const REVIEW_COLS = 'license_no, verified_identity, verified_license, review_note, reviewed_at, reviewed_by';
const LISTING_APP_COLS = `id, business_name, kind, city, url, contact_name, email, message, status, created_at, ${REVIEW_COLS}`;
const BUDDY_APP_COLS = `id, full_name, email, city, languages, services, bio, price_usd, status, created_at, ${REVIEW_COLS}`;
const BOOKING_COLS = 'id, buddy_id, customer_email, session_at, amount_usd, platform_fee_usd, buddy_payout_usd, status, created_at';
const PROFILE_COLS = 'id, email, plan, pro_until, role, created_at';

type Raw = PromiseLike<{ data: unknown; error: { message: string } | null }>;

/** Runs a query, or returns an error result when Supabase isn't configured (demo deployments). */
async function run<T>(query: (sb: SupabaseClient) => Raw): Promise<OpsResult<T>> {
  if (!supabase) return { data: null, error: { message: 'Supabase is not configured.' } };
  const { data, error } = await query(supabase);
  return { data: (data as T) ?? null, error: error ? { message: error.message } : null };
}

// numeric columns arrive as strings from PostgREST; the UI wants numbers.
const num = (v: unknown) => (v == null ? null : Number(v));

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------
/** Signed-in email + role, or null when signed out / unconfigured (= demo mode). */
export async function getOpsSession(): Promise<OpsSession | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user?.email) return null;
  const { data: row } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  return { email: user.email, role: (row?.role as Role | undefined) ?? 'user' };
}

// ---------------------------------------------------------------------------
// Partner (rows are limited by RLS to the signed-in email)
// ---------------------------------------------------------------------------
export const myListings = () => run<OpsListing[]>((sb) => sb.rpc('my_listings'));

export const updateMyListing = (id: string, patch: ListingPatch) =>
  run<OpsListing>((sb) => {
    const { description, price_from, url } = patch; // never send columns a partner can't change
    return sb.from('listings').update({ description, price_from, url }).eq('id', id).select(LISTING_COLS).single();
  });

/** Leads assigned to the partner's agents (an admin sees every lead). */
export const myLeads = () =>
  run<OpsLead[]>((sb) => sb.from('leads').select(LEAD_COLS).not('agent_id', 'is', null).order('created_at', { ascending: false }));

export const updateLeadStatus = (id: string, status: PartnerLeadStatus) =>
  run<OpsLead>((sb) => sb.from('leads').update({ status }).eq('id', id).select(LEAD_COLS).single());

async function applications(): Promise<OpsResult<Applications>> {
  const [l, b] = await Promise.all([
    run<ListingApplication[]>((sb) => sb.from('listing_applications').select(LISTING_APP_COLS).order('created_at', { ascending: false })),
    run<BuddyApplication[]>((sb) => sb.from('buddy_applications').select(BUDDY_APP_COLS).order('created_at', { ascending: false })),
  ]);
  const error = l.error ?? b.error;
  if (error) return { data: null, error };
  const buddies = (b.data ?? []).map((r) => ({ ...r, price_usd: num(r.price_usd) }));
  return { data: { listings: l.data ?? [], buddies }, error: null };
}

/** The partner's own applications (matched by email). */
export const myApplications = applications;

// ---------------------------------------------------------------------------
// Admin (RLS: public.is_admin(); a non-admin gets empty lists / failed updates)
// ---------------------------------------------------------------------------
export const listApplications = applications;

const appTable = (type: ApplicationType) => (type === 'listing' ? 'listing_applications' : 'buddy_applications');
const pickReview = ({ verified_identity, verified_license, review_note }: ReviewPatch) => ({ verified_identity, verified_license, review_note });

/**
 * Sets status (plus optional review fields in the same write). The DB refuses 'approved' unless
 * verified_identity is true (and verified_license for agencies). To grant the partner role, use approvePartner.
 */
export function setApplicationStatus(type: 'listing', id: string, status: ListingApplicationStatus, review?: ReviewPatch): Promise<OpsResult<{ id: string }>>;
export function setApplicationStatus(type: 'buddy', id: string, status: BuddyApplicationStatus, review?: ReviewPatch): Promise<OpsResult<{ id: string }>>;
export function setApplicationStatus(type: ApplicationType, id: string, status: string, review: ReviewPatch = {}) {
  return run<{ id: string }>((sb) =>
    sb.from(appTable(type)).update({ ...pickReview(review), status }).eq('id', id).select('id').single(),
  );
}

/** Ticks the verification checklist / saves the review note without changing status. */
export const verifyApplication = (type: ApplicationType, id: string, review: ReviewPatch) =>
  run<{ id: string }>((sb) => sb.from(appTable(type)).update(pickReview(review)).eq('id', id).select('id').single());

/** Which directory rows to hand to the applicant on approval (each only if still unowned). Omit = link nothing. */
export type PartnerLink = { listingId?: string | null; agentId?: string | null };

/** Approves a verified application and makes the applicant a partner (admin-only RPC). */
export const approvePartner = (type: ApplicationType, id: string, link: PartnerLink = {}) =>
  run<ApprovePartnerResult>((sb) =>
    sb.rpc('approve_partner', { app_type: type, app_id: id, listing_id: link.listingId ?? null, agent_id: link.agentId ?? null }),
  );

/** An unowned listing or agent row the admin can link on approval. */
export type LinkCandidate = { target: 'listing' | 'agent'; id: string; name: string; kind: ListingKind; city: string | null };

/** Unowned listings + agents for the approve picker (admin-only; others get an empty list). */
export const linkCandidates = () => run<LinkCandidate[]>((sb) => sb.rpc('link_candidates'));

export const listLeads = (status?: LeadStatus) =>
  run<OpsLead[]>((sb) => {
    const q = sb.from('leads').select(LEAD_COLS).order('created_at', { ascending: false });
    return status ? q.eq('status', status) : q;
  });

/** Assigns a lead to an agent (null unassigns). */
export const assignLead = (leadId: string, agentId: string | null) =>
  run<OpsLead>((sb) =>
    sb
      .from('leads')
      .update({ agent_id: agentId, assigned_at: agentId ? new Date().toISOString() : null })
      .eq('id', leadId)
      .select(LEAD_COLS)
      .single(),
  );

/** Agents for the assign-lead picker (admin sees unverified ones too). */
export const listAgents = () =>
  run<OpsAgent[]>((sb) => sb.from('agents').select('id, name, company, cities, verified').order('name'));

export const listListings = () => run<OpsListing[]>((sb) => sb.from('listings').select(LISTING_COLS).order('name'));

export const toggleListing = (id: string, field: 'active' | 'featured', value: boolean) =>
  run<OpsListing>((sb) => sb.from('listings').update({ [field]: value }).eq('id', id).select(LISTING_COLS).single());

export async function listBookings(): Promise<OpsResult<OpsBooking[]>> {
  const r = await run<OpsBooking[]>((sb) => sb.from('bookings').select(BOOKING_COLS).order('created_at', { ascending: false }));
  return r.data
    ? {
        data: r.data.map((b) => ({
          ...b,
          amount_usd: Number(b.amount_usd),
          platform_fee_usd: Number(b.platform_fee_usd),
          buddy_payout_usd: Number(b.buddy_payout_usd),
        })),
        error: null,
      }
    : r;
}

export const listProfiles = () =>
  run<OpsProfile[]>((sb) => sb.from('profiles').select(PROFILE_COLS).order('created_at', { ascending: false }));

export const setRole = (id: string, role: Role) =>
  run<OpsProfile>((sb) => sb.from('profiles').update({ role }).eq('id', id).select(PROFILE_COLS).single());

// ---------------------------------------------------------------------------
// Messages (lead chat: nomad <-> assigned agency). RLS: supabase/migrations/*_messages.sql.
// sender_role / sender_id / created_at are stamped by the DB; the client only sends lead_id + body.
// ---------------------------------------------------------------------------
export type SenderRole = 'customer' | 'partner' | 'admin';

export type OpsMessage = {
  id: string;
  lead_id: string;
  sender_role: SenderRole;
  sender_id: string | null;
  body: string;
  created_at: string;
  read_at: string | null;
};

/** One conversation = one lead, from public.my_threads(). */
export type OpsThread = {
  lead_id: string;
  my_role: 'customer' | 'partner';
  lead_name: string;
  visa_slug: string | null;
  agent_id: string | null;
  agent_name: string | null; // null until an admin assigns a (verified) agency
  created_at: string;
  last_body: string | null;
  last_at: string | null;
  last_sender_role: SenderRole | null;
  unread: number;
};

const MESSAGE_COLS = 'id, lead_id, sender_role, sender_id, body, created_at, read_at';
export const MESSAGE_MAX = 4000;

/** My conversations (as customer or partner), newest activity first. */
export const listThreads = () => run<OpsThread[]>((sb) => sb.rpc('my_threads'));

export const listMessages = (leadId: string) =>
  run<OpsMessage[]>((sb) => sb.from('lead_messages').select(MESSAGE_COLS).eq('lead_id', leadId).order('created_at').limit(500));

export const sendMessage = (leadId: string, body: string) =>
  run<OpsMessage>((sb) => sb.from('lead_messages').insert({ lead_id: leadId, body }).select(MESSAGE_COLS).single());

/** Marks everything the other side sent in this thread as read (RLS skips my own messages). */
export const markRead = (leadId: string) =>
  run<null>((sb) => sb.from('lead_messages').update({ read_at: new Date().toISOString() }).eq('lead_id', leadId).is('read_at', null));

/** Live inserts in all my threads: one channel, rows filtered per subscriber by the select policy. Returns an unsubscribe function. */
export function subscribeMessages(onInsert: (m: OpsMessage) => void): () => void {
  const sb = supabase;
  if (!sb) return () => {};
  const channel = sb
    .channel('lead_messages:mine')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'lead_messages' }, (p) => onInsert(p.new as OpsMessage))
    .subscribe();
  return () => void sb.removeChannel(channel);
}

// ---------------------------------------------------------------------------
// Delivery + reviews. RLS: supabase/migrations/*_delivery_reviews.sql.
// Partner: upload to deliverables/<lead_id>/, insert lead_deliveries, set 'delivered'.
// Customer: confirm ('completed'), then one review. The DB trigger checks every transition.
// ---------------------------------------------------------------------------
export const DELIVERY_BUCKET = 'deliverables';
export const DELIVERY_NOTE_MAX = 2000;
export const DELIVERY_FILE_MAX = 10 * 1024 * 1024; // matches the bucket's file_size_limit
export const DELIVERY_FILES_MAX = 10;
export const DELIVERY_TYPES = [
  'application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/heic',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
export const REVIEW_MAX = 1000;

export type DeliveryFile = { path: string; name: string; url: string | null }; // url: signed, 1 h
export type OpsDelivery = { id: string; lead_id: string; note: string | null; files: DeliveryFile[]; created_at: string };
export type OpsReview = { lead_id: string; rating: number; body: string | null; created_at: string };
export type AgentRating = { agent_id: string; avg_rating: number; review_count: number };

/** "1714000000000-a1b2-Visa letter.pdf" -> "Visa letter.pdf" */
const fileName = (path: string) => path.split('/').pop()!.replace(/^\d+-[0-9a-f]{4}-/, '');

/** Uploads files, records the delivery, then marks the lead delivered (that order: the DB needs the row first). */
export async function deliverWork(leadId: string, note: string, files: File[]): Promise<OpsResult<{ id: string }>> {
  if (!supabase) return { data: null, error: { message: 'Supabase is not configured.' } };
  const paths: string[] = [];
  for (const f of files) {
    const safe = f.name.replace(/[^\w.\- ]+/g, '_').slice(-80) || 'file';
    const path = `${leadId}/${Date.now()}-${crypto.randomUUID().slice(0, 4)}-${safe}`;
    const { error } = await supabase.storage.from(DELIVERY_BUCKET).upload(path, f, { contentType: f.type, upsert: false });
    if (error) return { data: null, error: { message: `${f.name}: ${error.message}` } };
    paths.push(path);
  }
  const ins = await run<{ id: string }>((sb) =>
    sb.from('lead_deliveries').insert({ lead_id: leadId, note: note.trim() || null, files: paths }).select('id').single(),
  );
  if (ins.error) return ins;
  const st = await run<null>((sb) => sb.from('leads').update({ status: 'delivered' }).eq('id', leadId));
  return st.error ? { data: null, error: st.error } : ins;
}

/** Deliveries for one lead, newest first, with 1-hour signed download links. */
export async function listDeliveries(leadId: string): Promise<OpsResult<OpsDelivery[]>> {
  const r = await run<{ id: string; lead_id: string; note: string | null; files: string[]; created_at: string }[]>((sb) =>
    sb.from('lead_deliveries').select('id, lead_id, note, files, created_at').eq('lead_id', leadId).order('created_at', { ascending: false }),
  );
  if (r.error || !r.data || !supabase) return { data: null, error: r.error };
  const all = r.data.flatMap((d) => d.files);
  const signed = all.length ? (await supabase.storage.from(DELIVERY_BUCKET).createSignedUrls(all, 3600)).data ?? [] : [];
  const url = new Map(signed.map((s) => [s.path, s.signedUrl ?? null]));
  return {
    data: r.data.map((d) => ({ ...d, files: d.files.map((p) => ({ path: p, name: fileName(p), url: url.get(p) ?? null })) })),
    error: null,
  };
}

/** One lead (customer sees their own; partner their assigned ones). */
export const getLead = (leadId: string) => run<OpsLead>((sb) => sb.from('leads').select(LEAD_COLS).eq('id', leadId).maybeSingle());

/** Customer: "I received the work" (delivered -> completed). */
export const confirmCompleted = (leadId: string) =>
  run<OpsLead>((sb) => sb.from('leads').update({ status: 'completed' }).eq('id', leadId).select(LEAD_COLS).single());

/** Customer: one review per completed lead. agent_id is taken from the lead by the DB. */
export const submitReview = (leadId: string, rating: number, body: string) =>
  run<null>((sb) => sb.from('agency_reviews').insert({ lead_id: leadId, rating, body: body.trim() || null }));

/** The signed-in customer's own reviews (lead_id is private, so this goes through an RPC). */
export const myReviews = () => run<OpsReview[]>((sb) => sb.rpc('my_reviews'));

/** Average stars + count for every reviewed agency (public). */
export const agentRatings = () => run<AgentRating[]>((sb) => sb.from('agent_ratings').select('agent_id, avg_rating, review_count'));
