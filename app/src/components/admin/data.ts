// One data source per mode: live queries (lib/ops.ts, RLS-guarded) for an admin session,
// an in-memory copy of the sample data for demo mode. Demo changes live only until the page reloads.
import * as ops from '../../lib/ops';
import type { OpsResult, ApplicationType, LeadStatus, LinkCandidate, PartnerLink, ReviewPatch, Role } from '../../lib/ops';
import { DEMO_AGENTS, DEMO_APPLICATIONS, DEMO_LEADS, DEMO_LISTINGS, DEMO_MY_LISTINGS, DEMO_MY_LEADS, DEMO_PROFILES } from '../../data/demo-ops';
import { setCount, type Mode } from './admin';

const local = {
  apps: structuredClone(DEMO_APPLICATIONS),
  leads: structuredClone(DEMO_LEADS),
  listings: structuredClone(DEMO_LISTINGS),
  profiles: structuredClone(DEMO_PROFILES),
  // Demo ownership: the demo partner owns DEMO_MY_LISTINGS and the agent on DEMO_MY_LEADS; the rest is unowned.
  candidates: [
    ...DEMO_LISTINGS.filter((l) => !DEMO_MY_LISTINGS.some((m) => m.id === l.id)).map((l) => ({ target: 'listing' as const, id: l.id, name: l.name, kind: l.kind, city: l.city })),
    ...DEMO_AGENTS.filter((a) => !DEMO_MY_LEADS.some((l) => l.agent_id === a.id)).map((a) => ({ target: 'agent' as const, id: a.id, name: a.name, kind: 'agency' as const, city: a.cities[0] ?? null })),
  ] as LinkCandidate[],
};

async function unwrap<T>(p: Promise<OpsResult<T>>): Promise<T> {
  const r = await p;
  if (r.error || r.data == null) throw new Error(r.error?.message ?? 'No data');
  return r.data;
}

function patch<T extends { id: string }>(rows: T[], id: string, change: Partial<T>): T {
  const row = rows.find((r) => r.id === id);
  if (!row) throw new Error('Not found');
  return Object.assign(row, change);
}

const patch_ = (type: ApplicationType, id: string, change: Record<string, unknown>) =>
  patch<{ id: string }>(type === 'listing' ? local.apps.listings : local.apps.buddies, id, change);

export function source(mode: Mode) {
  const live = mode === 'admin';
  return {
    applications: () => (live ? unwrap(ops.listApplications()) : Promise.resolve(local.apps)),
    /** Saves the checklist / note without changing status. */
    review: (type: ApplicationType, id: string, patch: ReviewPatch) =>
      live
        ? unwrap(ops.verifyApplication(type, id, patch))
        : Promise.resolve(patch_(type, id, { ...patch, reviewed_at: new Date().toISOString() })),
    /** Approves (DB refuses unless verified) and grants the partner role. Returns null in demo mode. */
    approve: async (type: ApplicationType, id: string, link: PartnerLink = {}) => {
      if (live) return unwrap(ops.approvePartner(type, id, link));
      patch_(type, id, { status: 'approved', reviewed_at: new Date().toISOString() });
      local.candidates = local.candidates.filter((c) => c.id !== link.listingId && c.id !== link.agentId);
      return null;
    },
    /** Unowned listings + agents for the "Link to listing" picker. */
    linkCandidates: () => (live ? unwrap(ops.linkCandidates()) : Promise.resolve(local.candidates)),
    /** Rejects and saves the checklist + note in the same write. */
    reject: (type: ApplicationType, id: string, review: ReviewPatch) =>
      live
        ? unwrap(
            type === 'listing'
              ? ops.setApplicationStatus('listing', id, 'rejected', review)
              : ops.setApplicationStatus('buddy', id, 'rejected', review),
          )
        : Promise.resolve(patch_(type, id, { ...review, status: 'rejected', reviewed_at: new Date().toISOString() })),

    leads: () => (live ? unwrap(ops.listLeads()) : Promise.resolve(local.leads)),
    agents: () => (live ? unwrap(ops.listAgents()) : Promise.resolve(DEMO_AGENTS)),
    assignLead: (id: string, agentId: string | null) =>
      live
        ? unwrap(ops.assignLead(id, agentId))
        : Promise.resolve(patch(local.leads, id, { agent_id: agentId, assigned_at: agentId ? new Date().toISOString() : null })),
    setLeadStatus: async (id: string, status: LeadStatus) => {
      if (!live) return patch(local.leads, id, { status });
      // ops.updateLeadStatus is typed for partners (sent/won/lost); RLS lets an admin set any status.
      return unwrap(ops.updateLeadStatus(id, status as ops.PartnerLeadStatus));
    },

    listings: () => (live ? unwrap(ops.listListings()) : Promise.resolve(local.listings)),
    toggleListing: (id: string, field: 'active' | 'featured', value: boolean) =>
      live ? unwrap(ops.toggleListing(id, field, value)) : Promise.resolve(patch(local.listings, id, { [field]: value })),

    profiles: () => (live ? unwrap(ops.listProfiles()) : Promise.resolve(local.profiles)),
    setRole: (id: string, role: Role) =>
      live ? unwrap(ops.setRole(id, role)) : Promise.resolve(patch(local.profiles, id, { role })),
  };
}

export type Overview = {
  pendingListingApps: number;
  pendingBuddyApps: number;
  newLeads: number;
  wonLeads: number;
  activeListings: number;
  featuredListings: number;
};

// shortcut: counts by fetching full lists; fine at MVP volume, switch to head:true count queries past ~1k rows.
export async function loadOverview(mode: Mode): Promise<Overview> {
  const s = source(mode);
  const [apps, leads, listings] = await Promise.all([s.applications(), s.leads(), s.listings()]);
  return {
    pendingListingApps: apps.listings.filter((a) => a.status === 'new').length,
    pendingBuddyApps: apps.buddies.filter((a) => a.status === 'new').length,
    newLeads: leads.filter((l) => l.status === 'new').length,
    wonLeads: leads.filter((l) => l.status === 'won').length,
    activeListings: listings.filter((l) => l.active).length,
    featuredListings: listings.filter((l) => l.active && l.featured).length,
  };
}

/** Refreshes the sidebar queue pills; silent on failure (the page shows its own errors). */
export function syncCounts(mode: Mode) {
  if (mode === 'denied') return;
  loadOverview(mode)
    .then((o) => {
      setCount('applications', o.pendingListingApps + o.pendingBuddyApps);
      setCount('leads', o.newLeads);
    })
    .catch(() => {});
}
