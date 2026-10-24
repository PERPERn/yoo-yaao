// Browser glue for /partner pages: picks demo or live data, toggles the shell's views, and routes
// writes to ops.ts (live) or local state (demo). Pages only render; they never talk to Supabase.
import {
  deliverWork,
  getOpsSession,
  listDeliveries,
  listThreads,
  myApplications,
  myLeads,
  myListings,
  updateLeadStatus,
  updateMyListing,
  type Applications,
  type OpsDelivery,
  type ListingPatch,
  type OpsLead,
  type OpsListing,
  type PartnerLeadStatus,
} from '../../lib/ops';
import { DEMO_DELIVERIES, DEMO_MY_APPLICATIONS, DEMO_MY_LEADS, DEMO_MY_LISTINGS, DEMO_SESSION_PARTNER, DEMO_THREADS } from '../../data/demo-ops';
import { signOut } from '../../lib/supabase';
import { cityLabel } from '../money/plans';

export type PartnerData = { email: string; listings: OpsListing[]; leads: OpsLead[]; apps: Applications; review?: boolean };
export type { OpsDelivery, OpsLead, OpsListing, PartnerLeadStatus };

let demo = true;

const view = (name: 'loading' | 'error' | 'none' | 'review' | 'ready') =>
  document.querySelectorAll<HTMLElement>('[data-p-view]').forEach((el) => (el.hidden = el.dataset.pView !== name));

/** Unwraps an OpsResult or throws its message (so the shell's error view can show it). */
function must<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

async function load(): Promise<PartnerData> {
  const session = await getOpsSession();
  demo = !session;
  if (!session) {
    // structuredClone: demo edits stay in this tab's copy and never touch the shared sample data.
    return structuredClone({
      email: DEMO_SESSION_PARTNER.email,
      listings: DEMO_MY_LISTINGS,
      leads: DEMO_MY_LEADS,
      apps: DEMO_MY_APPLICATIONS,
    });
  }
  // Role 'partner' is set by an admin on approval; until then the portal shows the review state.
  if (session.role === 'user') return { email: session.email, listings: [], leads: [], apps: { listings: [], buddies: [] }, review: true };
  const [listings, leads, apps] = await Promise.all([myListings(), myLeads(), myApplications()]);
  return { email: session.email, listings: must(listings) ?? [], leads: must(leads) ?? [], apps: must(apps) ?? { listings: [], buddies: [] } };
}

/** Loads data and calls `render(data, isDemo)`; handles loading / error / not-a-partner states. */
export function boot(render: (d: PartnerData, isDemo: boolean) => void): void {
  const run = async () => {
    view('loading');
    try {
      const d = await load();
      document.querySelector<HTMLElement>('[data-p-demo]')!.hidden = !demo;
      document.querySelector<HTMLElement>('[data-p-head-signout]')!.hidden = demo;
      document.querySelector('[data-p-who]')!.textContent = ` · ${d.email}`;
      const fresh = d.leads.filter((l) => l.status === 'new').length;
      const badge = document.querySelector<HTMLElement>('[data-p-newcount]');
      if (badge) {
        badge.hidden = !fresh;
        badge.textContent = String(fresh);
        badge.setAttribute('aria-label', `${fresh} new`);
      }
      void unreadBadge();
      if (d.review) {
        document.querySelector('[data-p-review-email]')!.textContent = d.email;
        return view('review');
      }
      if (!demo && !d.listings.length && !d.leads.length && !d.apps.listings.length && !d.apps.buddies.length) {
        document.querySelector('[data-p-none-email]')!.textContent = d.email;
        return view('none');
      }
      render(d, demo);
      view('ready');
    } catch (e) {
      document.querySelector('[data-p-error-text]')!.textContent =
        navigator.onLine === false ? "You're offline. Connect and try again." : `${e instanceof Error ? e.message : 'Unknown error'}. Try again in a moment.`;
      view('error');
    }
  };
  document.querySelector('[data-p-retry]')?.addEventListener('click', run);
  document.querySelectorAll('[data-p-signout]').forEach((b) =>
    b.addEventListener('click', async () => {
      await signOut().catch(() => {});
      location.href = '/account?next=/partner';
    }),
  );
  run();
}

/** Messages tab badge: unread messages from nomads across the partner's threads. */
async function unreadBadge() {
  const threads = demo ? DEMO_THREADS : ((await listThreads()).data ?? []);
  const total = threads.filter((t) => t.my_role === 'partner').reduce((n, t) => n + t.unread, 0);
  document.querySelectorAll<HTMLElement>('[data-unread-badge]').forEach((b) => {
    b.hidden = !total;
    b.textContent = String(total);
    b.setAttribute('aria-label', `${total} unread`);
  });
}

/** Demo: resolves after a short beat so the busy state is visible; live: writes through RLS. */
export async function setLeadStatus(id: string, status: PartnerLeadStatus): Promise<void> {
  if (demo) return new Promise((r) => setTimeout(r, 350));
  must(await updateLeadStatus(id, status));
}

/** Demo: files stay local, nothing is uploaded; returns the delivery to show. Live: storage + RLS. */
export async function submitDelivery(leadId: string, note: string, files: File[]): Promise<OpsDelivery | null> {
  if (demo) {
    await new Promise((r) => setTimeout(r, 700));
    return {
      id: `demo-local-${crypto.randomUUID()}`, lead_id: leadId, note: note.trim() || null, created_at: new Date().toISOString(),
      files: files.map((f) => ({ path: f.name, name: f.name, url: null })),
    };
  }
  must(await deliverWork(leadId, note, files));
  return null; // caller reloads the list (fresh signed links)
}

export async function loadDeliveries(leadId: string): Promise<OpsDelivery[]> {
  if (demo) return structuredClone(DEMO_DELIVERIES.filter((d) => d.lead_id === leadId));
  return must(await listDeliveries(leadId)) ?? [];
}

/** Returns true when the save was demo-only. */
export async function saveListing(id: string, patch: ListingPatch): Promise<boolean> {
  if (demo) {
    await new Promise((r) => setTimeout(r, 350));
    return true;
  }
  must(await updateMyListing(id, patch));
  return false;
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------
const LABELS: Record<string, string> = {
  new: 'New', sent: 'Replied', won: 'Won', lost: 'Lost', spam: 'Spam', delivered: 'Delivered', completed: 'Completed',
  approved: 'Approved', rejected: 'Not approved', paid: 'Approved and paid', review: 'In review',
};
export const statusLabel = (s: string) => LABELS[s] ?? s;

const KINDS: Record<string, string> = {
  coworking: 'Coworking', coliving: 'Coliving', agency: 'Visa agency', insurance: 'Insurance', esim: 'eSIM',
};
export const kindName = (k: string) => KINDS[k] ?? k;
export const cityName = (c: string | null) => (c ? cityLabel(c) : '');

/** Visa names come from the shell (data-visas) so the full visa dataset isn't bundled here. */
export const visaName = (slug: string | null) => {
  if (!slug) return '';
  try {
    return (JSON.parse(document.querySelector<HTMLElement>('[data-pp]')?.dataset.visas ?? '{}') as Record<string, string>)[slug] ?? slug.toUpperCase();
  } catch {
    return slug.toUpperCase();
  }
};

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
