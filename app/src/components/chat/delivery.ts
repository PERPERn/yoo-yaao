// Customer delivery panel + agency stars in the /messages thread header (DeliveryPanel.astro).
// Live: ops.ts (RLS decides who sees files and who may confirm/review). Demo: DEMO_* data, local only.
// User-supplied strings go in with textContent.
import {
  agentRatings,
  confirmCompleted,
  getLead,
  listDeliveries,
  myReviews,
  submitReview,
  type AgentRating,
  type LeadStatus,
  type OpsDelivery,
  type OpsReview,
  type OpsThread,
} from '../../lib/ops';
import { DEMO_AGENT_RATINGS, DEMO_DELIVERIES, DEMO_THREAD_STATUS } from '../../data/demo-ops';

const WORDS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

export const ratingLabel = (r: AgentRating) =>
  `Rated ${r.avg_rating.toFixed(1)} out of 5 from ${r.review_count} review${r.review_count === 1 ? '' : 's'}`;

/** Returns the onOpen hook for initChat. */
export function initDelivery(root: HTMLElement, { demo }: { demo: boolean }) {
  const $ = <T extends HTMLElement = HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const panel = $<HTMLDetailsElement>('[data-dlv]');
  const ratingEl = $('[data-chat-rating]');
  const list = $<HTMLOListElement>('[data-dlv-list]');
  const confirmBox = $('[data-dlv-confirm]');
  const confirmBtn = $<HTMLButtonElement>('[data-dlv-confirm-btn]');
  const form = $<HTMLFormElement>('[data-dlv-review]');
  const thanks = $('[data-dlv-thanks]');
  const word = $('[data-dlv-word]');

  // Demo state lives in this tab only.
  const demoStatus = { ...DEMO_THREAD_STATUS };
  const demoReviews = new Map<string, OpsReview>();
  let ratings: Promise<Map<string, AgentRating>> | null = null;
  let current: OpsThread | null = null;
  let status: LeadStatus = 'new';
  let seq = 0;

  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text?: string) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };
  const busy = (b: HTMLButtonElement, on: boolean) => {
    b.disabled = on;
    if (on) b.setAttribute('aria-busy', 'true');
    else b.removeAttribute('aria-busy');
  };

  async function drawRating(t: OpsThread) {
    ratingEl.hidden = true;
    if (!t.agent_id) return;
    ratings ??= demo
      ? Promise.resolve(new Map(DEMO_AGENT_RATINGS.map((r) => [r.agent_id, r])))
      : agentRatings().then((r) => new Map((r.data ?? []).map((x) => [x.agent_id, x])));
    const r = (await ratings).get(t.agent_id);
    if (!r || current?.lead_id !== t.lead_id) return;
    ratingEl.replaceChildren(el('span', 'chat__rating-star', '★'), el('strong', '', r.avg_rating.toFixed(1)), el('span', 'chat__rating-n', `(${r.review_count})`));
    ratingEl.setAttribute('role', 'img');
    ratingEl.setAttribute('aria-label', ratingLabel(r));
    ratingEl.hidden = false;
  }

  function drawFiles(ds: OpsDelivery[]) {
    list.replaceChildren(
      ...ds.map((d) => {
        const li = el('li');
        const t = el('time', '', `Delivered ${new Date(d.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}`);
        t.dateTime = d.created_at;
        li.append(t);
        if (d.note) li.append(el('p', 'dlv__note', d.note));
        for (const f of d.files) {
          const row = el('span', 'dlv__file');
          if (f.url) {
            const a = el('a', '', f.name);
            a.href = f.url;
            a.target = '_blank';
            a.rel = 'noopener';
            a.setAttribute('download', f.name);
            row.append(a);
          } else row.append(el('span', '', f.name), el('span', 'dlv__muted', demo ? ' (sample file)' : ' (link unavailable)'));
          li.append(row);
        }
        return li;
      }),
    );
  }

  function drawStep(review: OpsReview | undefined) {
    confirmBox.hidden = status !== 'delivered';
    form.hidden = status !== 'completed' || !!review;
    thanks.hidden = !review;
    if (review) thanks.textContent = `You rated this agency ${review.rating}/5. Thanks, your review helps other nomads.`;
    if (status === 'delivered') panel.dataset.needs = '';
    else delete panel.dataset.needs;
    $('[data-dlv-summary]').textContent =
      status === 'delivered' ? 'Work delivered: please confirm' : status === 'completed' && !review ? 'Work received: leave a review' : 'Work delivered';
  }

  async function onOpen(t: OpsThread | null) {
    const my = ++seq;
    current = t;
    panel.hidden = true;
    ratingEl.hidden = true;
    if (!t) return;
    void drawRating(t);
    $('[data-dlv-legend]').textContent = `How was ${t.agent_name ?? 'the agency'}?`;
    let ds: OpsDelivery[];
    let review: OpsReview | undefined;
    if (demo) {
      ds = DEMO_DELIVERIES.filter((d) => d.lead_id === t.lead_id);
      status = demoStatus[t.lead_id] ?? 'sent';
      review = demoReviews.get(t.lead_id);
    } else {
      const [lead, del, revs] = await Promise.all([getLead(t.lead_id), listDeliveries(t.lead_id), myReviews()]);
      if (my !== seq) return;
      ds = del.data ?? [];
      status = lead.data?.status ?? 'new';
      review = (revs.data ?? []).find((r) => r.lead_id === t.lead_id);
    }
    if (!ds.length && status !== 'completed') return;
    drawFiles(ds);
    drawStep(review);
    panel.open = status === 'delivered' || (status === 'completed' && !review);
    panel.hidden = false;
  }

  confirmBtn.addEventListener('click', async () => {
    if (!current) return;
    const err = $('[data-dlv-confirm-err]');
    err.textContent = '';
    busy(confirmBtn, true);
    const id = current.lead_id;
    if (demo) {
      await new Promise((r) => setTimeout(r, 400));
      demoStatus[id] = 'completed';
    } else {
      const r = await confirmCompleted(id);
      if (r.error) {
        busy(confirmBtn, false);
        err.textContent = `Couldn't confirm: ${r.error.message}`;
        return;
      }
    }
    busy(confirmBtn, false);
    status = 'completed';
    drawStep(undefined);
    form.querySelector<HTMLInputElement>('input[name="rating"]')?.focus();
  });

  form.addEventListener('change', () => {
    const v = Number(new FormData(form).get('rating') ?? 0);
    word.textContent = WORDS[v] ?? '';
    $('[data-dlv-rating-err]').textContent = '';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!current) return;
    const rating = Number(new FormData(form).get('rating') ?? 0);
    const body = $<HTMLTextAreaElement>('[data-dlv-body]').value;
    const ratingErr = $('[data-dlv-rating-err]');
    const err = $('[data-dlv-review-err]');
    err.textContent = '';
    if (!(rating >= 1 && rating <= 5)) {
      ratingErr.textContent = 'Choose 1 to 5 stars.';
      form.querySelector<HTMLInputElement>('input[name="rating"]')?.focus();
      return;
    }
    const btn = $<HTMLButtonElement>('[data-dlv-submit]');
    busy(btn, true);
    const id = current.lead_id;
    const review: OpsReview = { lead_id: id, rating, body: body.trim() || null, created_at: new Date().toISOString() };
    if (demo) {
      await new Promise((r) => setTimeout(r, 500));
      demoReviews.set(id, review);
    } else {
      const r = await submitReview(id, rating, body);
      if (r.error) {
        busy(btn, false);
        err.textContent = /duplicate|unique/i.test(r.error.message) ? 'You already reviewed this job.' : `Couldn't post: ${r.error.message}`;
        return;
      }
      ratings = null; // refetch the average next time
    }
    busy(btn, false);
    drawStep(review);
    thanks.focus();
  });

  return onOpen;
}
