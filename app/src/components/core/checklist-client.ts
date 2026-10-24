// Client behaviour for a document checklist. Used by /visas/[slug] and /tools/checklist.
// Markup contract (inside `root`):
//   input[type=checkbox][data-check-item]   value = document text (the storage key)
//   input[data-check-note][data-item="…"]   optional free-text note per document
//   [data-check-count] [data-check-total]   "4 of 11"
//   [data-check-bar]                        progress fill, scaled with transform
//   [data-check-progress]                   element with role=progressbar (aria-valuenow is set)
//   [data-check-done]                       shown when every item is ticked
//   [data-sync-status]                      "Saved on this device" / "Synced to your account"
import { readChecklist, writeChecklist } from './storage';
import { getProState } from './pro';
import { listChecklist, toggleChecklistItem } from '../../lib/supabase';

export function bindChecklist(root: HTMLElement, slug: string): void {
  const boxes = Array.from(root.querySelectorAll<HTMLInputElement>('input[data-check-item]'));
  const notes = Array.from(root.querySelectorAll<HTMLInputElement>('input[data-check-note]'));
  const status = root.querySelector<HTMLElement>('[data-sync-status]');
  let state = readChecklist(slug);
  let synced = false;

  const render = () => {
    const done = boxes.filter((b) => b.checked).length;
    root.querySelectorAll<HTMLElement>('[data-check-count]').forEach((el) => (el.textContent = String(done)));
    root.querySelectorAll<HTMLElement>('[data-check-total]').forEach((el) => (el.textContent = String(boxes.length)));
    const ratio = boxes.length ? done / boxes.length : 0;
    root.querySelectorAll<HTMLElement>('[data-check-bar]').forEach((el) => (el.style.transform = `scaleX(${ratio})`));
    root.querySelectorAll<HTMLElement>('[data-check-progress]').forEach((el) => {
      el.setAttribute('aria-valuenow', String(done));
      el.setAttribute('aria-valuemax', String(boxes.length));
    });
    root.querySelectorAll<HTMLElement>('[data-check-done]').forEach((el) => (el.hidden = done !== boxes.length || !boxes.length));
    boxes.forEach((b) => b.closest('[data-check-row]')?.toggleAttribute('data-done', b.checked));
  };

  const apply = () => {
    boxes.forEach((b) => (b.checked = Boolean(state.done[b.value])));
    notes.forEach((n) => (n.value = state.notes[n.dataset.item ?? ''] ?? ''));
    render();
  };

  const setStatus = (text: string) => {
    if (status) status.textContent = text;
  };

  boxes.forEach((b) =>
    b.addEventListener('change', async () => {
      state.done[b.value] = b.checked;
      writeChecklist(slug, state);
      render();
      if (synced) {
        setStatus('Syncing…');
        try {
          await toggleChecklistItem(slug, b.value, b.checked);
          setStatus('Synced to your account ✓');
        } catch {
          setStatus('Saved on this device. Sync failed — we’ll retry on your next change.');
        }
      }
    }),
  );
  notes.forEach((n) =>
    n.addEventListener('input', () => {
      state.notes[n.dataset.item ?? ''] = n.value.slice(0, 200);
      writeChecklist(slug, state);
    }),
  );

  apply();
  setStatus('Saved on this device');

  getProState().then(async (pro) => {
    if (!pro.isPro) return;
    try {
      const remote = await listChecklist(slug);
      for (const r of remote) state.done[r.item] = r.done;
      writeChecklist(slug, state);
      synced = true;
      apply();
      setStatus('Synced to your account ✓');
    } catch {
      setStatus('Saved on this device. Couldn’t reach your account.');
    }
  });

  // Another tab (or the other checklist page) changed the same list.
  window.addEventListener('storage', (e) => {
    if (e.key && e.key.endsWith(`:${slug}`)) {
      state = readChecklist(slug);
      apply();
    }
  });
}
