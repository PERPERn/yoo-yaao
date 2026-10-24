// Client helpers shared by every /admin page script. Pages are static: each page calls boot() for the
// mode, then loads demo or live rows. RLS is the real guard; the UI only hides what a non-admin can't use.
import { supabase, getSession } from '../../lib/supabase';
import { DEMO_SESSION_ADMIN } from '../../data/demo-ops';

export type Mode = 'demo' | 'admin' | 'denied';
type State = 'loading' | 'empty' | 'error' | 'ready';

const q = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);

/**
 * Resolves the mode, shows the demo banner or the "Not authorised" panel. `email` is who "you" are
 * (the demo admin in demo mode), used to stop an admin from changing their own role.
 */
export async function boot(): Promise<{ mode: Mode; email: string }> {
  const main = q('[data-adm-main]')!;
  const who = q('[data-who]');
  let mode: Mode = 'demo';
  let reason = "You're not signed in as an admin.";
  let email = '';

  if (!supabase) {
    reason = "Sign-in isn't set up on this deployment.";
  } else {
    const session = await getSession().catch(() => null);
    email = session?.user.email ?? '';
    if (session) {
      const { data, error } = await supabase.rpc('is_admin');
      if (error) reason = "We couldn't check your admin access right now.";
      else mode = data === true ? 'admin' : 'denied';
    }
  }

  main.dataset.mode = mode;
  main.removeAttribute('aria-busy');
  q('[data-demo-banner]')!.hidden = mode !== 'demo';
  q('[data-demo-reason]')!.textContent = reason;
  q('[data-denied]')!.hidden = mode !== 'denied';
  q('[data-denied-email]')!.textContent = email || 'unknown';
  if (who) who.textContent = mode === 'admin' ? `Signed in as ${email}` : mode === 'denied' ? `${email} (not admin)` : 'Demo mode';
  return { mode, email: mode === 'demo' ? DEMO_SESSION_ADMIN.email : email };
}

/** Screen-reader announcement (and the visible status line passed in, if any). */
export function announce(msg: string, visible?: HTMLElement | null) {
  const live = q('[data-announce]');
  if (live) {
    live.textContent = '';
    requestAnimationFrame(() => (live.textContent = msg));
  }
  if (visible) visible.textContent = msg;
}

/** Sidebar queue count (gold pill). Hidden at 0. */
export function setCount(key: 'applications' | 'leads', n: number) {
  const el = q(`[data-count="${key}"]`);
  if (!el) return;
  el.hidden = n === 0;
  q('[data-count-n]', el)!.textContent = String(n);
}

/**
 * A panel holds: [data-state] (loading/empty/error message), a <tbody data-rows>, and
 * <template data-row> with one <tr>. Cloning the template keeps Astro's scoped classes on Buttons.
 */
export function setState(panel: HTMLElement, state: State, msg?: string) {
  const box = q('[data-state]', panel)!;
  const table = q('.adm-scroll', panel);
  panel.setAttribute('aria-busy', String(state === 'loading'));
  box.dataset.state = state;
  box.hidden = state === 'ready';
  if (table) table.hidden = state !== 'ready';
  const text = q('[data-state-text]', box)!;
  const retry = q<HTMLButtonElement>('[data-retry]', box);
  if (retry) retry.hidden = state !== 'error';
  q('[data-skel]', box)?.toggleAttribute('hidden', state !== 'loading');
  text.textContent =
    msg ?? (state === 'loading' ? 'Loading…' : state === 'empty' ? 'Nothing here yet.' : "Couldn't load this. Try again.");
}

/** Clones the row template per item (it may hold extra rows, e.g. a review drawer); fill gets the first <tr>. */
export function renderRows<T>(panel: HTMLElement, rows: T[], fill: (tr: HTMLTableRowElement, row: T) => void, empty?: string) {
  const tbody = q<HTMLTableSectionElement>('[data-rows]', panel)!;
  const tpl = q<HTMLTemplateElement>('template[data-row]', panel)!;
  tbody.replaceChildren(
    ...rows.map((r) => {
      const frag = tpl.content.cloneNode(true) as DocumentFragment;
      fill(frag.querySelector('tr')!, r);
      return frag;
    }),
  );
  setState(panel, rows.length ? 'ready' : 'empty', rows.length ? undefined : empty);
}

/** Sets textContent on [data-f="name"] inside root (never innerHTML: rows hold user-submitted text). */
export function put(root: ParentNode, field: string, value: string | number | null | undefined) {
  const el = q(`[data-f="${field}"]`, root);
  if (el) el.textContent = value == null || value === '' ? '—' : String(value);
  return el;
}

export function stamp(root: ParentNode, field: string, label: string, tone: 'new' | 'good' | 'bad' | 'info' | 'neutral') {
  const el = put(root, field, label);
  if (el) el.dataset.tone = tone;
}

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
export const fmtDate = (iso: string | null | undefined) => (iso ? dateFmt.format(new Date(iso)) : '—');
