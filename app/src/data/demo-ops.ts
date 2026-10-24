import type {
  ApplicationReview,
  Applications,
  OpsAgent,
  OpsBooking,
  OpsLead,
  OpsListing,
  OpsMessage,
  OpsProfile,
  OpsSession,
  OpsThread,
} from '../lib/ops';

// SAMPLE DATA for /partner and /admin when nobody is signed in (judges, previews).
// Every person, agency, lead and booking here is fictional; emails use example.com.
// Nothing is read from or written to the database in demo mode.
// Ids reuse src/data/listings.ts and src/data/buddies.ts where a real row would point at them.

export const DEMO_OPS_NOTICE = 'Demo view — sample data';

/** The partner the demo portal "signs in" as: owns Siam Visa Partners and one coworking listing. */
export const DEMO_SESSION_PARTNER: OpsSession = { email: 'partner@example.com', role: 'partner' };
export const DEMO_SESSION_ADMIN: OpsSession = { email: 'admin@example.com', role: 'admin' };

export const DEMO_AGENTS: OpsAgent[] = [
  { id: 'demo-agent-siam', name: 'Siam Visa Partners (demo)', company: 'Siam Visa Partners Co., Ltd.', cities: ['bangkok', 'phuket'], verified: true },
  { id: 'demo-agent-lanna', name: 'Lanna Legal (demo)', company: 'Lanna Legal Services', cities: ['chiang-mai'], verified: true },
  { id: 'demo-agent-andaman', name: 'Andaman Visa Desk (demo)', company: null, cities: ['phuket'], verified: false },
];

export const DEMO_LISTINGS: OpsListing[] = [
  {
    id: 'demo-listing-ari-cowork', kind: 'coworking', name: 'Ari Desk Club (demo)', city: 'bangkok',
    url: 'https://example.com/ari-desk-club', price_from: '350 THB / day',
    description: 'Quiet coworking two minutes from BTS Ari. Fast fibre, phone booths, day passes.',
    affiliate: false, active: true, featured: true, featured_until: '2026-11-24T00:00:00Z', created_at: '2026-10-02T09:00:00Z',
  },
  {
    id: 'demo-listing-nimman-coliving', kind: 'coliving', name: 'Nimman Nest (demo)', city: 'chiang-mai',
    url: 'https://example.com/nimman-nest', price_from: '14,000 THB / month',
    description: 'Coliving for remote workers with monthly rooms and a shared workspace.',
    affiliate: false, active: true, featured: false, featured_until: null, created_at: '2026-10-08T09:00:00Z',
  },
  {
    id: 'demo-listing-siam-visa', kind: 'agency', name: 'Siam Visa Partners (demo)', city: 'bangkok',
    url: 'https://example.com/siam-visa', price_from: null,
    description: 'Licensed agency for DTV and LTR applications.',
    affiliate: false, active: false, featured: false, featured_until: null, created_at: '2026-10-20T09:00:00Z',
  },
  {
    id: 'bkk-the-hive-thonglor', kind: 'coworking', name: 'The Hive Thonglor', city: 'bangkok',
    url: 'https://thehive.co.th/', price_from: null, description: null,
    affiliate: false, active: true, featured: true, featured_until: null, created_at: '2026-10-23T09:00:00Z',
  },
  {
    id: 'cnx-punspace', kind: 'coworking', name: 'Punspace', city: 'chiang-mai',
    url: null, price_from: null, description: null,
    affiliate: false, active: true, featured: false, featured_until: null, created_at: '2026-10-23T09:00:00Z',
  },
];
/** Listings owned by DEMO_SESSION_PARTNER. */
export const DEMO_MY_LISTINGS: OpsListing[] = DEMO_LISTINGS.filter((l) =>
  ['demo-listing-ari-cowork', 'demo-listing-siam-visa'].includes(l.id),
);

const lead = (id: string, name: string, status: OpsLead['status'], agent_id: string | null, extra: Partial<OpsLead>): OpsLead => ({
  id, name, email: `${id}@example.com`, nationality: null, visa_slug: 'dtv', city: 'bangkok', message: null,
  source: 'experts', status, agent_id, assigned_at: agent_id ? '2026-10-22T10:00:00Z' : null, created_at: '2026-10-21T08:00:00Z',
  ...extra,
});

/** One or more leads in every status. */
export const DEMO_LEADS: OpsLead[] = [
  lead('demo-lead-1', 'Anna K. (demo)', 'new', null, { nationality: 'German', message: 'Freelance designer, want DTV before January.', created_at: '2026-10-24T07:30:00Z' }),
  lead('demo-lead-2', 'Tom R. (demo)', 'new', 'demo-agent-siam', { nationality: 'British', visa_slug: 'ltr', city: 'phuket', created_at: '2026-10-23T16:10:00Z', assigned_at: '2026-10-23T17:00:00Z' }),
  lead('demo-lead-3', 'Mei L. (demo)', 'sent', 'demo-agent-siam', { nationality: 'Singaporean', message: 'Need help with bank statement requirement.' }),
  lead('demo-lead-4', 'Diego S. (demo)', 'won', 'demo-agent-siam', { nationality: 'Spanish', created_at: '2026-10-15T11:00:00Z', assigned_at: '2026-10-15T12:00:00Z' }),
  lead('demo-lead-5', 'Priya N. (demo)', 'lost', 'demo-agent-siam', { nationality: 'Indian', visa_slug: 'privilege', created_at: '2026-10-12T09:00:00Z', assigned_at: '2026-10-12T10:00:00Z' }),
  lead('demo-lead-6', 'Jonas B. (demo)', 'sent', 'demo-agent-lanna', { nationality: 'Swedish', city: 'chiang-mai' }),
  lead('demo-lead-7', 'Buy cheap followers', 'spam', null, { visa_slug: null, city: null, source: null, message: 'http://spam.example' }),
];
/** Leads assigned to DEMO_SESSION_PARTNER's agent. */
export const DEMO_MY_LEADS: OpsLead[] = DEMO_LEADS.filter((l) => l.agent_id === 'demo-agent-siam');

/** Verification fields; defaults = not yet reviewed. */
const review = (r: Partial<ApplicationReview> = {}): ApplicationReview => ({
  license_no: null, verified_identity: false, verified_license: false, review_note: null, reviewed_at: null, reviewed_by: null,
  ...r,
});

export const DEMO_APPLICATIONS: Applications = {
  listings: [
    { id: 'demo-app-l1', business_name: 'Old Town Desks (demo)', kind: 'coworking', city: 'phuket', url: 'https://example.com/old-town-desks', contact_name: 'Kai (demo)', email: 'kai@example.com', message: 'Day passes and monthly desks near Thalang Road.', status: 'new', created_at: '2026-10-24T05:00:00Z', ...review() },
    { id: 'demo-app-l5', business_name: 'Chao Phraya Visa Co. (demo)', kind: 'agency', city: 'bangkok', url: 'https://example.com/chao-phraya-visa', contact_name: 'Nan (demo)', email: 'nan@example.com', message: 'DTV and LTR filings, English and Thai.', status: 'new', created_at: '2026-10-23T10:00:00Z', ...review({ license_no: 'TAT 11/05678', verified_identity: true, review_note: 'Passport matches director. TAT licence lookup pending.', reviewed_at: '2026-10-24T02:00:00Z', reviewed_by: 'demo-profile-admin' }) },
    { id: 'demo-app-l2', business_name: 'Siam Visa Partners (demo)', kind: 'agency', city: 'bangkok', url: 'https://example.com/siam-visa', contact_name: 'Ploy (demo)', email: 'partner@example.com', message: 'Licence no. on request.', status: 'approved', created_at: '2026-10-20T08:00:00Z', ...review({ license_no: 'TAT 11/01234', verified_identity: true, verified_license: true, review_note: 'Director passport matches. TAT licence checked.', reviewed_at: '2026-10-21T09:00:00Z', reviewed_by: 'demo-profile-admin' }) },
    { id: 'demo-app-l3', business_name: 'Ari Desk Club (demo)', kind: 'coworking', city: 'bangkok', url: 'https://example.com/ari-desk-club', contact_name: 'Ploy (demo)', email: 'partner@example.com', message: null, status: 'paid', created_at: '2026-10-02T08:00:00Z', ...review({ license_no: '0105566001234', verified_identity: true, review_note: 'Business registration checked.', reviewed_at: '2026-10-03T09:00:00Z', reviewed_by: 'demo-profile-admin' }) },
    { id: 'demo-app-l4', business_name: 'Visa Run Express (demo)', kind: 'agency', city: null, url: null, contact_name: null, email: 'run@example.com', message: 'We do border runs.', status: 'rejected', created_at: '2026-10-18T08:00:00Z', ...review({ review_note: 'No licence. Border runs are not a service we list.', reviewed_at: '2026-10-18T12:00:00Z', reviewed_by: 'demo-profile-admin' }) },
  ],
  buddies: [
    { id: 'demo-app-b1', full_name: 'Beam S. (demo)', email: 'beam@example.com', city: 'bangkok', languages: ['Thai', 'English'], services: ['Apartment viewing', 'Bank visit'], bio: 'Property agent by day, happy to help newcomers on weekends.', price_usd: 30, status: 'new', created_at: '2026-10-24T03:00:00Z', ...review() },
    { id: 'demo-app-b2', full_name: 'Ploy (demo)', email: 'ploy@example.com', city: 'bangkok', languages: ['Thai', 'English'], services: ['Apartment viewing', 'City orientation'], bio: null, price_usd: 35, status: 'approved', created_at: '2026-10-10T03:00:00Z', ...review({ verified_identity: true, review_note: 'ID card checked on video call.', reviewed_at: '2026-10-11T03:00:00Z', reviewed_by: 'demo-profile-admin' }) },
    { id: 'demo-app-b3', full_name: 'Sam T. (demo)', email: 'sam@example.com', city: 'phuket', languages: ['English'], services: ['Visa paperwork'], bio: 'Can fill in your immigration forms.', price_usd: 80, status: 'rejected', created_at: '2026-10-09T03:00:00Z', ...review({ review_note: 'Buddies cannot do visa paperwork.', reviewed_at: '2026-10-09T08:00:00Z', reviewed_by: 'demo-profile-admin' }) },
  ],
};
/** Applications sent from DEMO_SESSION_PARTNER's email. */
export const DEMO_MY_APPLICATIONS: Applications = {
  listings: DEMO_APPLICATIONS.listings.filter((a) => a.email === DEMO_SESSION_PARTNER.email),
  buddies: DEMO_APPLICATIONS.buddies.filter((a) => a.email === DEMO_SESSION_PARTNER.email),
};

const booking = (id: string, buddy_id: string, amount_usd: number, status: OpsBooking['status'], session_at: string): OpsBooking => {
  const platform_fee_usd = Math.round(amount_usd * 0.2 * 100) / 100; // demo 20% platform fee
  return {
    id, buddy_id, customer_email: `${id}@example.com`, session_at, amount_usd, platform_fee_usd,
    buddy_payout_usd: Math.round((amount_usd - platform_fee_usd) * 100) / 100, status, created_at: session_at,
  };
};

export const DEMO_BOOKINGS: OpsBooking[] = [
  booking('demo-booking-1', 'demo-ploy-bkk', 35, 'paid', '2026-10-25T03:00:00Z'),
  booking('demo-booking-2', 'demo-mark-bkk', 30, 'paid', '2026-10-22T06:00:00Z'),
  booking('demo-booking-3', 'demo-arthit-cnx', 40, 'pending', '2026-10-27T02:00:00Z'),
  booking('demo-booking-4', 'demo-somchai-hkt', 45, 'refunded', '2026-10-18T04:00:00Z'),
];

export const DEMO_PROFILES: OpsProfile[] = [
  { id: 'demo-profile-admin', email: DEMO_SESSION_ADMIN.email, plan: 'free', pro_until: null, role: 'admin', created_at: '2026-10-01T00:00:00Z' },
  { id: 'demo-profile-partner', email: DEMO_SESSION_PARTNER.email, plan: 'free', pro_until: null, role: 'partner', created_at: '2026-10-02T00:00:00Z' },
  { id: 'demo-profile-pro', email: 'nomad.pro@example.com', plan: 'pro', pro_until: '2027-10-20T00:00:00Z', role: 'user', created_at: '2026-10-20T00:00:00Z' },
  { id: 'demo-profile-free', email: 'nomad@example.com', plan: 'free', pro_until: null, role: 'user', created_at: '2026-10-23T00:00:00Z' },
];

// ---------------------------------------------------------------------------
// Admin overview charts (sample only until analytics and Stripe are connected).
// Revenue ends at the month-12 base case /revenue shows (net $1,890: B2C $907, B2B $851, C2C $132).
// ---------------------------------------------------------------------------
export type DemoRevenueMonth = { month: string; b2c: number; b2b: number; c2c: number };

/** Net revenue per month in USD, oldest first (Nov 2025 → Oct 2026). */
export const DEMO_REVENUE_SERIES: DemoRevenueMonth[] = [
  { month: '2025-11', b2c: 40, b2b: 0, c2c: 7 },
  { month: '2025-12', b2c: 85, b2b: 49, c2c: 14 },
  { month: '2026-01', b2c: 130, b2b: 49, c2c: 21 },
  { month: '2026-02', b2c: 190, b2b: 98, c2c: 28 },
  { month: '2026-03', b2c: 250, b2b: 147, c2c: 35 },
  { month: '2026-04', b2c: 330, b2b: 196, c2c: 49 },
  { month: '2026-05', b2c: 410, b2b: 294, c2c: 56 },
  { month: '2026-06', b2c: 500, b2b: 392, c2c: 70 },
  { month: '2026-07', b2c: 600, b2b: 490, c2c: 84 },
  { month: '2026-08', b2c: 700, b2b: 588, c2c: 98 },
  { month: '2026-09', b2c: 800, b2b: 735, c2c: 112 },
  { month: '2026-10', b2c: 907, b2b: 851, c2c: 132 },
];

/** Pro subscribers at month end (this month vs last). */
export const DEMO_PRO_SUBSCRIBERS = { now: 107, prev: 96 };

/** Last month's values for the KPI delta chips. */
export const DEMO_KPI_PREV = { wonRate: 0.4, activeListings: 3 };

export const DEMO_TRAFFIC = {
  visits: 18_420,
  visitsPrev: 15_960,
  uniques: 11_240,
  uniquesPrev: 9_870,
  /** Visits per day, last 14 days, oldest first. */
  daily: [1080, 1150, 1230, 1190, 1310, 1420, 1260, 1290, 1380, 1460, 1410, 1540, 1620, 1580],
  topPages: [
    { path: '/finder', visits: 6_210 },
    { path: '/visas/dtv', visits: 3_480 },
    { path: '/tools', visits: 2_140 },
    { path: '/cities/chiang-mai', visits: 1_390 },
    { path: '/pricing', visits: 1_120 },
  ],
  topCountries: [
    { country: 'United States', visits: 3_920 },
    { country: 'Germany', visits: 2_310 },
    { country: 'United Kingdom', visits: 2_050 },
    { country: 'Australia', visits: 1_470 },
    { country: 'France', visits: 1_180 },
  ],
};

/** Visit → finder → sign-up → paid, this month. */
export const DEMO_FUNNEL = [
  { step: 'Visited the site', count: 18_420 },
  { step: 'Used the Visa Finder', count: 6_210 },
  { step: 'Created an account', count: 1_150 },
  { step: 'Paid (Pro, listing or buddy)', count: 143 },
];

export const DEMO_STATUS = { uptimePct: 99.97 };

// ---------------------------------------------------------------------------
// Messages (/messages for the nomad, /partner/messages for the agency).
// Times are relative to page load so the demo always reads as a live conversation.
// ---------------------------------------------------------------------------
const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
const DAY = 24 * 60;
const msg = (id: string, lead_id: string, sender_role: OpsMessage['sender_role'], min: number, body: string, read = true): OpsMessage => ({
  id, lead_id, sender_role, sender_id: `demo-${sender_role}`, body, created_at: ago(min), read_at: read ? ago(Math.max(min - 5, 0)) : null,
});

export const DEMO_MESSAGES: OpsMessage[] = [
  // Mei L. <-> Siam Visa Partners: DTV, savings proof
  msg('demo-msg-1', 'demo-lead-3', 'customer', 2 * DAY + 90, "Hi! I'm a freelance UX designer from Singapore and want to apply for the DTV in Bangkok. The form asks for 500,000 THB in savings. Does it have to be in one account?"),
  msg('demo-msg-2', 'demo-lead-3', 'partner', 2 * DAY + 50, 'Hi Mei, thanks for reaching out. It can be across accounts, but the embassy wants statements for the last 3 months showing that balance. Is the money in a Singapore bank?'),
  msg('demo-msg-3', 'demo-lead-3', 'customer', 2 * DAY + 20, 'Yes, DBS. The balance has been above 600k THB equivalent since July.'),
  msg('demo-msg-4', 'demo-lead-3', 'partner', DAY + 200, "Perfect, that works. For the remote-work part we'll need 2–3 client contracts or invoices plus your portfolio link. Our fee is 9,500 THB, paid through Yoo Yaao once you approve the quote."),
  msg('demo-msg-5', 'demo-lead-3', 'customer', DAY + 170, 'Great. My contracts are with EU clients and in English. Do they need a certified translation?'),
  msg('demo-msg-6', 'demo-lead-3', 'partner', 25, 'English is fine, no translation needed. Next step: a 20-minute call to check your documents together. Does tomorrow at 10:00 or 15:00 (Bangkok time) work?', false),
  // Tom R. -> Siam Visa Partners: LTR, not yet answered
  msg('demo-msg-7', 'demo-lead-2', 'customer', 180, "Hello, I'm looking at the LTR work-from-Thailand category. My employer is UK-based with about £40m revenue. Is that enough to qualify?", false),
  // Jonas B. <-> Lanna Legal: DTV in Chiang Mai
  msg('demo-msg-8', 'demo-lead-6', 'partner', 3 * DAY, "Hej Jonas, Lanna Legal here. We've read your request about the DTV in Chiang Mai. Could you tell us roughly when you plan to fly in?"),
  msg('demo-msg-9', 'demo-lead-6', 'customer', 3 * DAY - 30, 'Early December. I can send my documents list this week.'),
];

const thread = (lead_id: string, my_role: OpsThread['my_role'], lead_name: string, visa_slug: string, agent_id: string, agent_name: string, unread: number): OpsThread => {
  const last = DEMO_MESSAGES.filter((m) => m.lead_id === lead_id).at(-1)!;
  return {
    lead_id, my_role, lead_name, visa_slug, agent_id, agent_name, unread,
    created_at: DEMO_MESSAGES.find((m) => m.lead_id === lead_id)!.created_at,
    last_body: last.body, last_at: last.created_at, last_sender_role: last.sender_role,
  };
};

/** my_role 'customer' rows = the nomad's /messages; 'partner' rows = Siam Visa Partners' inbox. */
export const DEMO_THREADS: OpsThread[] = [
  thread('demo-lead-3', 'customer', 'Mei L. (demo)', 'dtv', 'demo-agent-siam', 'Siam Visa Partners (demo)', 1),
  thread('demo-lead-6', 'customer', 'Mei L. (demo)', 'dtv', 'demo-agent-lanna', 'Lanna Legal (demo)', 0),
  thread('demo-lead-2', 'partner', 'Tom R. (demo)', 'ltr', 'demo-agent-siam', 'Siam Visa Partners (demo)', 1),
  thread('demo-lead-3', 'partner', 'Mei L. (demo)', 'dtv', 'demo-agent-siam', 'Siam Visa Partners (demo)', 0),
].sort((a, b) => b.last_at!.localeCompare(a.last_at!));

/** Demo auto-replies from the other side, used in turn. */
export const DEMO_REPLIES: Record<OpsThread['my_role'], string[]> = {
  customer: [ // the agency answering the nomad
    "Thanks, noted. I'll check this with our team and get back to you today.",
    "Good question. Short answer: yes, that's fine. I'll add it to your document checklist.",
    'Got it. Anything else before our call?',
  ],
  partner: [ // the nomad answering the agency
    'Thank you! That helps a lot.',
    'Sounds good, 10:00 works for me.',
    "Great, I'll send those over tonight.",
  ],
};
