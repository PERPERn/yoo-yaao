// Browser helpers shared by the money pages (pricing, account, buddies, partners, experts, revenue).
// Runs in the browser only. Never import server modules from here.
import type { ProductId } from '../../types/contracts';
import { getAccessToken } from '../../lib/supabase';

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------
export type CheckoutBody = {
  productId: ProductId;
  email?: string;
  buddyId?: string;
  sessionAt?: string;
  listingName?: string;
  listingKind?: string;
  listingCity?: string;
};

/** What we remember across the Stripe round trip, so /account can show the right success panel. */
export type PendingCheckout = {
  productId: ProductId;
  label: string;          // "Stay Pro, yearly", "Session with Ploy (demo)"
  amountUsd: number;
  returnTo: string;       // page the user started from (for "cancelled" links)
  buddyId?: string;
  buddyName?: string;
  service?: string;
  sessionAt?: string;
  timeLabel?: string;
  meeting?: string;
  listingName?: string;
  listingCity?: string;
  startedAt: string;
};

const PENDING_KEY = 'yy:pending-checkout';

export function savePending(p: PendingCheckout): void {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(p));
    localStorage.setItem(PENDING_KEY, JSON.stringify(p)); // survives a new tab after Stripe
  } catch {
    /* storage blocked: success page falls back to a generic message */
  }
}

export function readPending(): PendingCheckout | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY) ?? localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PendingCheckout;
    // Ignore anything older than a day.
    if (Date.now() - new Date(p.startedAt).getTime() > 86_400_000) return null;
    return p;
  } catch {
    return null;
  }
}

export function clearPending(): void {
  try {
    sessionStorage.removeItem(PENDING_KEY);
    localStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}

export type CheckoutResult =
  | { ok: true; url: string }
  | {
      ok: false;
      code: 'payments_not_configured' | 'offline' | 'validation_failed' | 'error';
      details?: Record<string, string>;
      demoUrl?: string; // set when Stripe isn't configured: the labelled no-charge demo on /checkout/status
    };

/**
 * POST /api/checkout. Sends the Supabase bearer token when signed in (links Pro to the profile).
 * On success it redirects to Stripe and the promise never meaningfully resolves for the caller.
 */
export async function startCheckout(body: CheckoutBody, pending?: PendingCheckout): Promise<CheckoutResult> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { ok: false, code: 'offline' };
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  try {
    const token = await getAccessToken();
    if (token) headers.authorization = `Bearer ${token}`;
  } catch {
    /* guest checkout */
  }
  let res: Response;
  try {
    res = await fetch('/api/checkout', { method: 'POST', headers, body: JSON.stringify(body) });
  } catch {
    return { ok: false, code: navigator.onLine === false ? 'offline' : 'error' };
  }
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string; details?: Record<string, string> };
  if (res.ok && data.url) {
    if (pending) savePending(pending);
    // Back button from Stripe restores this page from bfcache with the button still busy: reload it.
    window.addEventListener('pageshow', (e) => e.persisted && location.reload(), { once: true });
    window.location.href = data.url;
    return { ok: true, url: data.url };
  }
  if (data.error === 'payments_not_configured') {
    if (pending) savePending(pending); // lets the demo receipt show the buddy name / return link
    const q = new URLSearchParams({ demo: '1', product: body.productId });
    if (body.buddyId) q.set('buddy', body.buddyId);
    return { ok: false, code: 'payments_not_configured', demoUrl: `/checkout/status?${q}` };
  }
  if (data.error === 'validation_failed') return { ok: false, code: 'validation_failed', details: data.details };
  return { ok: false, code: 'error' };
}

/**
 * Reveals the right pre-rendered callout from <PayNotice /> inside `scope` for a failed checkout
 * (or hides them all when `result` is null). Returns the element shown.
 */
export function showPayNotice(scope: ParentNode, result: CheckoutResult | null): HTMLElement | null {
  scope.querySelectorAll<HTMLElement>('[data-pay-notice]').forEach((el) => (el.hidden = true));
  if (!result || result.ok) return null;
  const key = result.code === 'payments_not_configured' ? 'not_configured' : result.code === 'offline' ? 'offline' : 'error';
  const el = scope.querySelector<HTMLElement>(`[data-pay-notice="${key}"]`);
  if (el) {
    const demo = el.querySelector<HTMLAnchorElement>('[data-demo-pay]');
    if (demo) demo.hidden = !('demoUrl' in result && result.demoUrl);
    if (demo && 'demoUrl' in result && result.demoUrl) demo.href = result.demoUrl;
    el.hidden = false;
    el.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }
  return el;
}

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------
/** Busy state for a ui/Button: disables it and swaps the label, returns a restore function. */
export function setBusy(btn: HTMLButtonElement | null, busyLabel: string): () => void {
  if (!btn) return () => {};
  const label = btn.querySelector<HTMLElement>('.btn__label');
  const original = label?.textContent ?? '';
  btn.disabled = true;
  btn.setAttribute('aria-busy', 'true');
  btn.classList.add('m-busy');
  if (label) label.textContent = busyLabel;
  return () => {
    btn.disabled = false;
    btn.removeAttribute('aria-busy');
    btn.classList.remove('m-busy');
    if (label) label.textContent = original;
  };
}

export function setButtonLabel(btn: Element | null, text: string): void {
  const label = btn?.querySelector<HTMLElement>('.btn__label');
  if (label) label.textContent = text;
}

// ---------------------------------------------------------------------------
// Forms: inline validation that writes into ui/Field's live error region (`${id}-error`)
// ---------------------------------------------------------------------------
export type Validator = (form: HTMLFormElement) => Record<string, string>; // fieldId -> message

export function setFieldError(form: HTMLFormElement, id: string, message: string): void {
  const err = document.getElementById(`${id}-error`);
  if (err) err.textContent = message;
  const control = form.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
  const group = control?.closest('fieldset');
  const targets = control ? [control] : Array.from(form.querySelectorAll<HTMLElement>(`[data-group="${id}"] input`));
  targets.forEach((el) => {
    if (message) el.setAttribute('aria-invalid', 'true');
    else el.removeAttribute('aria-invalid');
  });
  group?.classList.toggle('field--invalid', Boolean(message));
}

export function clearErrors(form: HTMLFormElement): void {
  form.querySelectorAll<HTMLElement>('.field__error').forEach((el) => (el.textContent = ''));
  form.querySelectorAll<HTMLElement>('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
}

/** Applies a validator; returns true when valid. Focuses the first invalid field when `focus` is set. */
export function applyValidation(form: HTMLFormElement, validate: Validator, focus = true): boolean {
  const errors = validate(form);
  const ids = new Set<string>();
  form.querySelectorAll<HTMLElement>('[id$="-error"]').forEach((el) => ids.add(el.id.replace(/-error$/, '')));
  ids.forEach((id) => setFieldError(form, id, errors[id] ?? ''));
  const first = Object.keys(errors)[0];
  if (first && focus) {
    const el =
      form.querySelector<HTMLElement>(`#${CSS.escape(first)}`) ??
      form.querySelector<HTMLElement>(`[data-group="${first}"] input`);
    el?.focus();
  }
  return !first;
}

/** Re-validate one field on blur (and on input once it has been flagged). */
export function liveValidate(form: HTMLFormElement, validate: Validator): void {
  const touched = new Set<string>();
  const check = (id: string) => {
    if (!touched.has(id)) return;
    const errors = validate(form);
    setFieldError(form, id, errors[id] ?? '');
  };
  const idFor = (el: HTMLElement) => el.closest<HTMLElement>('[data-group]')?.dataset.group ?? el.id;
  form.addEventListener('focusout', (e) => {
    const el = e.target as HTMLElement;
    if (!el.matches('input, select, textarea')) return;
    const id = idFor(el);
    // Don't flag a group while focus is still moving inside it.
    if (el.closest('[data-group]')) return;
    touched.add(id);
    check(id);
  });
  form.addEventListener('change', (e) => {
    const el = e.target as HTMLElement;
    const id = idFor(el);
    if (el.closest('[data-group]')) touched.add(id);
    check(id);
  });
  form.addEventListener('input', (e) => check(idFor(e.target as HTMLElement)));
}

export const val = (form: HTMLFormElement, name: string): string => {
  const el = form.elements.namedItem(name);
  if (!el) return '';
  if (el instanceof RadioNodeList) return el.value.trim();
  return ((el as HTMLInputElement).value ?? '').trim();
};

export const checkedValues = (form: HTMLFormElement, name: string): string[] =>
  Array.from(form.querySelectorAll<HTMLInputElement>(`input[name="${name}"]:checked`)).map((i) => i.value);

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const COMMON_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'proton.me', 'live.com'];
/** "name@gmial.com" -> "name@gmail.com" (simple edit-distance check on the domain). */
export function suggestEmail(email: string): string | null {
  const [user, domain] = email.toLowerCase().split('@');
  if (!user || !domain || COMMON_DOMAINS.includes(domain)) return null;
  const dist = (a: string, b: string) => {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++)
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  };
  const best = COMMON_DOMAINS.map((c) => ({ c, d: dist(domain, c) })).sort((a, b) => a.d - b.d)[0];
  return best && best.d > 0 && best.d <= 2 ? `${user}@${best.c}` : null;
}

export type PostResult = { ok: true; data: Record<string, unknown> } | { ok: false; status: number; error: string; details?: Record<string, string> };

/** POST JSON to one of our form routes. */
export async function postJson(url: string, body: Record<string, unknown>): Promise<PostResult> {
  if (navigator.onLine === false) return { ok: false, status: 0, error: 'offline' };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) return { ok: true, data: await res.json().catch(() => ({})) };
    const data = (await res.json().catch(() => ({}))) as { error?: string; details?: Record<string, string> };
    return { ok: false, status: res.status, error: data.error ?? 'error', details: data.details };
  } catch {
    return { ok: false, status: 0, error: !navigator.onLine ? 'offline' : 'network' };
  }
}

export function formErrorMessage(r: Extract<PostResult, { ok: false }>): string {
  if (r.error === 'offline') return "You're offline. Connect to the internet and try again. Your info is still here.";
  if (r.error === 'database_not_configured')
    return "We can't save forms on this preview yet (the database isn't connected). Your info is still here.";
  if (r.error === 'validation_failed') return 'Some fields need another look. Check the messages above.';
  return 'Something went wrong on our side. Try again. Your info is still here.';
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------
export const usd = (n: number, decimals?: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals ?? (Number.isInteger(n) ? 0 : 2),
    maximumFractionDigits: decimals ?? 2,
  }).format(n);

/** "14 Jan 2027" — unambiguous, per ux-flow §6. */
export const fmtDate = (d: Date | string): string => {
  const date = typeof d === 'string' ? new Date(d.length === 10 ? `${d}T00:00:00` : d) : d;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

export function relTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 45) return 'just now';
  if (diff < 3600) return `${Math.round(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)} h ago`;
  return `${Math.round(diff / 86400)} d ago`;
}

export const prefersReducedMotion = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Tween a number into an element (count-up). Respects reduced motion. */
export function countTo(el: HTMLElement, to: number, format: (n: number) => string, duration = 900): void {
  const from = Number(el.dataset.value ?? '0') || 0;
  el.dataset.value = String(to);
  if (prefersReducedMotion() || from === to) {
    el.textContent = format(to);
    return;
  }
  const start = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = format(from + (to - from) * eased);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export function shortRef(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  bytes.forEach((b) => (out += chars[b % chars.length]));
  return out;
}

/** A tiny .ics file for "Add to calendar". */
export function downloadIcs(opts: { title: string; start: Date; minutes: number; description?: string; location?: string }): void {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const end = new Date(opts.start.getTime() + opts.minutes * 60_000);
  const esc = (s: string) => s.replace(/[\\,;]/g, (m) => `\\${m}`).replace(/\n/g, '\\n');
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//longstay//money//EN',
    'BEGIN:VEVENT',
    `UID:${shortRef()}@longstay`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(opts.start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${esc(opts.title)}`,
    opts.description ? `DESCRIPTION:${esc(opts.description)}` : '',
    opts.location ? `LOCATION:${esc(opts.location)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'booking.ics';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Offline banner support: disables [data-needs-network] buttons and explains why. */
export function watchNetwork(): void {
  const apply = () => {
    const offline = navigator.onLine === false;
    document.querySelectorAll<HTMLElement>('[data-offline-note]').forEach((el) => (el.hidden = !offline));
    document.querySelectorAll<HTMLButtonElement>('button[data-needs-network]').forEach((b) => {
      if (offline) b.setAttribute('aria-disabled', 'true');
      else b.removeAttribute('aria-disabled');
    });
  };
  window.addEventListener('online', apply);
  window.addEventListener('offline', apply);
  apply();
}
