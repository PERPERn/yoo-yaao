/**
 * Camera stage, shared by the visa wall and the Thailand map.
 * Spots are plain links to the full page. With JS, a click flies the pre-rendered camera to that
 * spot (<key>-in.mp4), then shows the sharp still and its panel; Back plays <key>-out.mp4.
 * Reduced motion, Save-Data, a missing clip or a portrait screen: a crossfade to the still.
 */
const CLIP_WAIT = 1500; // ms before giving up on a clip and crossfading

export function initStage(root: HTMLElement) {
  const base = root.dataset.stage!;
  const spots = [...root.querySelectorAll<HTMLAnchorElement>('[data-spot]')];
  const panels = [...root.querySelectorAll<HTMLElement>('[data-panel]')];
  const stills = [...root.querySelectorAll<HTMLImageElement>('[data-still]')];
  const video = root.querySelector<HTMLVideoElement>('[data-clip]')!;
  const keys = spots.map((s) => s.dataset.spot!);
  const wide = matchMedia('(min-width: 60rem) and (min-aspect-ratio: 3/2)');
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  let open: string | null = null;
  let run = 0; // bumps on every move, so a stale clip never finishes a newer one

  const show = (key: string | null) => {
    for (const p of panels) p.hidden = p.dataset.panel !== key;
    for (const s of stills) {
      const on = s.dataset.still === key;
      s.toggleAttribute('data-on', on);
      if (on && s.dataset.src) {
        s.src = s.dataset.src;
        delete s.dataset.src;
      }
    }
    for (const s of spots) s.toggleAttribute('data-active', s.dataset.spot === key);
  };

  /** Plays a clip to its end. False when there is none to play. */
  const play = (key: string, dir: 'in' | 'out') =>
    new Promise<boolean>((done) => {
      if (!wide.matches || still.matches || saveData) return done(false);
      const end = (ok: boolean) => {
        clearTimeout(timer);
        video.onended = video.onerror = video.onplaying = null;
        done(ok);
      };
      let timer = window.setTimeout(() => end(false), CLIP_WAIT);
      video.onplaying = () => {
        clearTimeout(timer);
        timer = window.setTimeout(() => end(true), 4000); // a clip is ~1.4s; never hang on a stall
        root.dataset.rolling = '';
      };
      video.onended = () => end(true);
      video.onerror = () => end(false);
      video.src = `${base}${key}-${dir}.mp4`;
      video.play().catch(() => end(false));
    });

  async function enter(key: string) {
    const me = ++run;
    const from = open;
    open = key;
    root.dataset.phase = 'moving';
    root.dataset.at = key;
    const img = stills.find((s) => s.dataset.still === key);
    if (img?.dataset.src) {
      img.src = img.dataset.src;
      delete img.dataset.src;
    }
    if (!from) await play(key, 'in'); // between two open spots: crossfade the stills
    if (me !== run) return;
    await img?.decode().catch(() => undefined);
    if (me !== run) return;
    show(key);
    root.dataset.phase = 'open';
    delete root.dataset.rolling;
    const title = panels.find((p) => p.dataset.panel === key)?.querySelector<HTMLElement>('[data-panel-title]');
    title?.focus({ preventScroll: true });
  }

  async function leave() {
    const key = open;
    if (!key) return;
    const me = ++run;
    open = null;
    root.dataset.phase = 'moving';
    for (const p of panels) p.hidden = true;
    await Promise.race([play(key, 'out'), new Promise((r) => setTimeout(r, CLIP_WAIT + 4000))]);
    if (me !== run) return;
    show(null);
    root.dataset.phase = 'idle';
    delete root.dataset.rolling;
    delete root.dataset.at;
    spots.find((s) => s.dataset.spot === key)?.focus({ preventScroll: true });
  }

  for (const s of spots) {
    const key = s.dataset.spot!;
    s.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
      e.preventDefault();
      enter(key);
    });
    // Warm the cache when a visitor shows interest.
    const warm = () => {
      if (!wide.matches || still.matches || saveData) return;
      fetch(`${base}${key}-in.mp4`).catch(() => undefined);
    };
    s.addEventListener('pointerenter', warm, { once: true });
    s.addEventListener('focus', warm, { once: true });
  }
  root.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('[data-stage-back]')) leave();
    const step = t.closest<HTMLElement>('[data-stage-step]');
    if (step && open) enter(keys[(keys.indexOf(open) + Number(step.dataset.stageStep) + keys.length) % keys.length]);
  });
  root.addEventListener('keydown', (e) => {
    if (!open) return;
    if (e.key === 'Escape') leave();
    if (wide.matches && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      const d = e.key === 'ArrowRight' ? 1 : -1;
      enter(keys[(keys.indexOf(open) + d + keys.length) % keys.length]);
    }
  });
  root.dataset.phase = 'idle';

  /** Portrait: spots are a swipe row; the one in the middle drives the panel below. */
  return { show, wide, spots };
}
