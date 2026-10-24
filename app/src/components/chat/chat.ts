// Browser logic for Chat.astro. Live: ops.ts (RLS + Realtime). Demo: DEMO_* data, local appends and a
// canned reply from the other side ~1.5 s later; nothing is written to the database.
// Every user-supplied string goes in with textContent, never innerHTML.
import {
  listMessages,
  listThreads,
  markRead,
  sendMessage,
  subscribeMessages,
  MESSAGE_MAX,
  type OpsMessage,
  type OpsThread,
} from '../../lib/ops';
import { DEMO_MESSAGES, DEMO_REPLIES, DEMO_THREADS } from '../../data/demo-ops';

type Side = OpsThread['my_role'];
type Pending = OpsMessage & { state?: 'sending' | 'failed' };

export function initChat(root: HTMLElement, { demo }: { demo: boolean }) {
  const side = root.dataset.side as Side;
  const $ = <T extends HTMLElement = HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const listEl = $<HTMLUListElement>('[data-chat-threads]');
  const log = $('[data-chat-log]');
  const pill = $<HTMLButtonElement>('[data-chat-pill]');
  const form = $<HTMLFormElement>('[data-chat-form]');
  const input = $<HTMLTextAreaElement>('[data-chat-input]');
  const send = $<HTMLButtonElement>('[data-chat-send]');
  const visas = JSON.parse(root.dataset.visas ?? '{}') as Record<string, string>;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let threads: OpsThread[] = [];
  let current: OpsThread | null = null;
  let messages: Pending[] = [];
  let replyIdx = 0;
  let openSeq = 0; // ignores late responses after switching threads

  // ---------- formatting ----------
  const dayKey = (iso: string) => new Date(iso).toDateString();
  function dayLabel(iso: string) {
    const d = new Date(iso);
    const today = new Date();
    const y = new Date(today);
    y.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === y.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  }
  function rel(iso: string, short = false) {
    const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
    if (min < 1) return 'just now';
    if (min < 60) return short ? `${min} min` : `${min} min ago`;
    const d = new Date(iso);
    if (dayKey(iso) === new Date().toDateString()) return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return short ? dayLabel(iso) : `${dayLabel(iso)}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
  }
  const fullTime = (iso: string) => new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  const titleOf = (t: OpsThread) => (side === 'customer' ? (t.agent_name ?? 'Matching you with an agency') : t.lead_name);
  const subOf = (t: OpsThread) =>
    [t.visa_slug ? (visas[t.visa_slug] ?? t.visa_slug.toUpperCase()) : '', side === 'customer' && !t.agent_name ? 'Our team is choosing a licensed agency' : '']
      .filter(Boolean)
      .join(' · ') || 'Visa enquiry';
  const isMine = (m: OpsMessage) => m.sender_role === side;
  const whoOf = (m: OpsMessage) => (isMine(m) ? 'You' : m.sender_role === 'admin' ? 'Yoo Yaao team' : current ? titleOf(current) : '');

  function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  // ---------- unread badges (list + PartnerShell tab) ----------
  function syncBadges() {
    const total = threads.reduce((n, t) => n + t.unread, 0);
    document.querySelectorAll<HTMLElement>('[data-unread-badge]').forEach((b) => {
      b.hidden = !total;
      b.textContent = String(total);
      b.setAttribute('aria-label', `${total} unread`);
    });
  }

  // ---------- thread list ----------
  function drawList() {
    $('[data-chat-list-loading]').hidden = true;
    listEl.hidden = !threads.length;
    $('[data-chat-list-empty]').hidden = threads.length > 0;
    listEl.replaceChildren(
      ...threads.map((t) => {
        const li = el('li');
        const a = el('a', 'chat__item');
        a.href = `?lead=${encodeURIComponent(t.lead_id)}`;
        if (current?.lead_id === t.lead_id) a.setAttribute('aria-current', 'true');
        const top = el('span', 'chat__item-top');
        top.append(el('span', 'chat__item-name', titleOf(t)));
        if (t.last_at || t.created_at) {
          const time = el('time', 'chat__item-time', rel(t.last_at ?? t.created_at, true));
          time.dateTime = t.last_at ?? t.created_at;
          top.append(time);
        }
        const bottom = el('span', 'chat__item-bottom');
        const preview = t.last_body ? `${t.last_sender_role === side ? 'You: ' : ''}${t.last_body}` : 'No messages yet';
        bottom.append(el('span', 'chat__item-preview', preview));
        if (t.unread) {
          const badge = el('span', 'chat__badge tabular', String(t.unread));
          badge.setAttribute('aria-label', `${t.unread} unread`);
          bottom.append(badge);
          a.dataset.unread = '';
        }
        a.append(top, bottom);
        a.addEventListener('click', (e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey) return;
          e.preventDefault();
          history.pushState(null, '', a.href);
          open(t.lead_id, true);
        });
        li.append(a);
        return li;
      }),
    );
    syncBadges();
  }

  // ---------- messages ----------
  const nearBottom = () => log.scrollHeight - log.scrollTop - log.clientHeight < 64;
  const toBottom = (smooth = false) => log.scrollTo({ top: log.scrollHeight, behavior: smooth && !reduced ? 'smooth' : 'auto' });

  function bubble(m: Pending, animate: boolean) {
    const wrap = el('div', `chat__msg${isMine(m) ? ' chat__msg--mine' : ''}${animate ? ' chat__msg--new' : ''}`);
    wrap.dataset.id = m.id;
    if (m.state) wrap.dataset.state = m.state;
    wrap.append(el('span', 'sr-only', `${whoOf(m)}: `));
    wrap.append(el('p', 'chat__body', m.body));
    const meta = el('span', 'chat__meta');
    if (m.state === 'sending') meta.append(el('span', '', 'Sending…'));
    else if (m.state === 'failed') {
      meta.append(el('span', 'chat__failed', "Couldn't send."));
      const retry = el('button', 'chat__retry', 'Retry');
      retry.type = 'button';
      retry.addEventListener('click', () => deliver(m));
      meta.append(retry);
    } else {
      const t = el('time', '', rel(m.created_at));
      t.dateTime = m.created_at;
      t.title = fullTime(m.created_at);
      t.dataset.rel = '';
      meta.append(t);
    }
    wrap.append(meta);
    return wrap;
  }

  function separator(iso: string) {
    const s = el('div', 'chat__day');
    s.setAttribute('role', 'separator');
    s.dataset.day = dayKey(iso);
    s.append(el('span', '', dayLabel(iso)));
    return s;
  }

  /** Full redraw (thread open). History is not announced: aria-live is off while it renders. */
  function drawMessages() {
    log.setAttribute('aria-live', 'off');
    log.removeAttribute('aria-busy');
    if (!messages.length) {
      const empty = el('div', 'chat__log-empty');
      empty.append(
        el('p', 'chat__empty-title', 'No messages yet'),
        el('p', 'chat__muted', side === 'customer' ? 'Say hello and describe your situation. The agency usually replies within 1 business day.' : 'Introduce yourself and ask what they need. Replies show up here.'),
      );
      log.replaceChildren(empty);
    } else {
      const nodes: HTMLElement[] = [];
      let day = '';
      for (const m of messages) {
        if (dayKey(m.created_at) !== day) nodes.push(separator(m.created_at));
        day = dayKey(m.created_at);
        nodes.push(bubble(m, false));
      }
      log.replaceChildren(...nodes);
    }
    toBottom();
    requestAnimationFrame(() => log.setAttribute('aria-live', 'polite'));
  }

  /** Appends one message (incoming or optimistic) with the enter animation. */
  function append(m: Pending) {
    const stick = nearBottom() || isMine(m);
    log.querySelector('.chat__log-empty')?.remove();
    const lastDay = [...log.querySelectorAll<HTMLElement>('.chat__day')].at(-1)?.dataset.day;
    if (lastDay !== dayKey(m.created_at)) log.append(separator(m.created_at));
    log.append(bubble(m, true));
    if (stick) toBottom(true);
    else pill.hidden = false;
  }

  function replace(m: Pending) {
    log.querySelector(`[data-id="${CSS.escape(m.id)}"]`)?.replaceWith(bubble(m, false));
  }

  function bumpThread(m: OpsMessage, unread: boolean) {
    const t = threads.find((x) => x.lead_id === m.lead_id);
    if (!t) return;
    t.last_body = m.body;
    t.last_at = m.created_at;
    t.last_sender_role = m.sender_role;
    if (unread) t.unread += 1;
    threads.sort((a, b) => (b.last_at ?? b.created_at).localeCompare(a.last_at ?? a.created_at));
    drawList();
  }

  function incoming(m: OpsMessage) {
    if (!current || m.lead_id !== current.lead_id || messages.some((x) => x.id === m.id)) return;
    // Our own insert echoed by Realtime before the insert response: the response will reconcile it.
    if (isMine(m) && messages.some((x) => x.state && x.body === m.body)) return;
    messages.push(m);
    append(m);
    const seen = document.visibilityState === 'visible';
    bumpThread(m, !isMine(m) && !seen);
    if (!isMine(m) && seen && !demo) void markRead(m.lead_id);
  }

  /** Every live insert I can see (RLS). Open thread: append; other thread: preview + unread; unknown: refetch list. */
  function live(m: OpsMessage) {
    if (m.lead_id === current?.lead_id) return incoming(m);
    if (threads.some((t) => t.lead_id === m.lead_id)) return bumpThread(m, !isMine(m));
    void listThreads().then((r) => {
      if (!r.data) return;
      threads = r.data.filter((t) => t.my_role === side);
      current = threads.find((t) => t.lead_id === current?.lead_id) ?? current;
      drawList();
    });
  }

  async function deliver(m: Pending) {
    m.state = 'sending';
    replace(m);
    const leadId = m.lead_id;
    try {
      let saved: OpsMessage;
      if (demo) {
        await new Promise((r) => setTimeout(r, 400));
        saved = { ...m, id: `demo-local-${crypto.randomUUID()}`, created_at: new Date().toISOString() };
      } else {
        const r = await sendMessage(leadId, m.body);
        if (r.error || !r.data) throw new Error(r.error?.message ?? 'send failed');
        saved = r.data;
      }
      const oldId = m.id;
      Object.assign(m, saved, { state: undefined });
      log.querySelector(`[data-id="${CSS.escape(oldId)}"]`)?.replaceWith(bubble(m, false));
      bumpThread(m, false);
      if (demo) cannedReply(leadId);
    } catch {
      m.state = 'failed';
      replace(m);
    }
  }

  function cannedReply(leadId: string) {
    const text = DEMO_REPLIES[side][replyIdx++ % DEMO_REPLIES[side].length];
    setTimeout(() => {
      const other: OpsMessage['sender_role'] = side === 'customer' ? 'partner' : 'customer';
      incoming({ id: `demo-reply-${crypto.randomUUID()}`, lead_id: leadId, sender_role: other, sender_id: `demo-${other}`, body: text, created_at: new Date().toISOString(), read_at: null });
    }, 1500);
  }

  // ---------- composer ----------
  const canSend = () => !!input.value.trim() && input.value.length <= MESSAGE_MAX && !!current;
  function syncComposer() {
    send.disabled = !canSend();
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 160)}px`;
  }
  input.addEventListener('input', syncComposer);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      form.requestSubmit();
    }
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!canSend() || !current) return;
    const m: Pending = {
      id: `tmp-${crypto.randomUUID()}`, lead_id: current.lead_id, sender_role: side, sender_id: null,
      body: input.value.trim(), created_at: new Date().toISOString(), read_at: null, state: 'sending',
    };
    messages.push(m);
    append(m);
    input.value = '';
    syncComposer();
    input.focus();
    void deliver(m);
  });

  // ---------- scroll pill ----------
  log.addEventListener('scroll', () => {
    if (nearBottom()) pill.hidden = true;
  }, { passive: true });
  pill.addEventListener('click', () => {
    toBottom(true);
    pill.hidden = true;
  });

  // ---------- open / close a thread ----------
  async function open(leadId: string | null, focus = false) {
    const seq = ++openSeq;
    current = threads.find((t) => t.lead_id === leadId) ?? null;
    root.dataset.open = String(!!current);
    $('[data-chat-thread]').hidden = !current;
    $('[data-chat-placeholder]').hidden = !!current;
    $('[data-chat-placeholder-text]').textContent = leadId && !current ? "This conversation isn't available. Pick one from the list." : 'Choose a conversation to read it.';
    pill.hidden = true;
    drawList();
    if (!current) return;
    const t = current;
    $('[data-chat-title]').textContent = titleOf(t);
    $('[data-chat-sub]').textContent = subOf(t);
    input.value = '';
    syncComposer();
    // Loading skeleton
    log.setAttribute('aria-busy', 'true');
    log.replaceChildren(...['', 'mine', '', 'mine'].map((k, i) => {
      const s = el('span', `chat-skel chat-skel--bubble${k ? ' chat-skel--mine' : ''}`);
      s.style.width = `${[62, 48, 70, 40][i]}%`;
      return s;
    }));
    if (demo) {
      messages = structuredClone(DEMO_MESSAGES.filter((m) => m.lead_id === t.lead_id));
    } else {
      const r = await listMessages(t.lead_id);
      if (seq !== openSeq) return;
      if (r.error) {
        log.removeAttribute('aria-busy');
        const err = el('p', 'chat__list-error', `Couldn't load messages: ${r.error.message}`);
        err.setAttribute('role', 'alert');
        log.replaceChildren(err);
        return;
      }
      messages = r.data ?? [];
    }
    drawMessages();
    if (t.unread) {
      t.unread = 0;
      drawList();
      if (!demo) void markRead(t.lead_id);
    }
    if (focus) input.focus({ preventScroll: true });
  }

  $('[data-chat-back]').addEventListener('click', (e) => {
    e.preventDefault();
    history.pushState(null, '', location.pathname);
    open(null);
    listEl.querySelector<HTMLElement>('a')?.focus();
  });
  addEventListener('popstate', () => open(new URLSearchParams(location.search).get('lead')));

  // Refresh relative times once a minute.
  setInterval(() => {
    log.querySelectorAll<HTMLTimeElement>('time[data-rel]').forEach((t) => (t.textContent = rel(t.dateTime)));
    listEl.querySelectorAll<HTMLTimeElement>('time').forEach((t) => (t.textContent = rel(t.dateTime, true)));
  }, 60_000);

  // ---------- boot ----------
  (async () => {
    if (demo) threads = structuredClone(DEMO_THREADS.filter((t) => t.my_role === side));
    else {
      const r = await listThreads();
      if (r.error) {
        $('[data-chat-list-loading]').hidden = true;
        const err = $('[data-chat-list-error]');
        err.textContent = `Couldn't load conversations: ${r.error.message}`;
        err.hidden = false;
        return;
      }
      threads = (r.data ?? []).filter((t) => t.my_role === side);
      subscribeMessages(live); // one channel for the page's lifetime
    }
    drawList();
    const want = new URLSearchParams(location.search).get('lead');
    // Desktop shows the newest thread straight away; on a phone the list comes first.
    const wide = matchMedia('(min-width: 48rem)').matches;
    await open(want ?? (wide ? (threads[0]?.lead_id ?? null) : null));
  })();
}
