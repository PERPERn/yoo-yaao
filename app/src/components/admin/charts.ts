// Tiny inline-SVG charts for the admin overview (no chart library). Specs follow the dataviz skill:
// 2px lines, >=8px end-dots with a 2px surface ring, <=24px columns with 4px rounded tops,
// hairline recessive grid, text in ink tokens (never the series colour), hover + keyboard readout.
// Charts draw at the container's real width so labels stay legible at 375px; they redraw on resize.

const NS = 'http://www.w3.org/2000/svg';
export const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, parent?: Element) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  parent?.append(n);
  return n;
}

function root(box: HTMLElement, h: number, label: string) {
  const w = Math.max(240, Math.round(box.clientWidth));
  const svg = el('svg', { width: w, height: h, viewBox: `0 0 ${w} ${h}`, role: 'img', 'aria-label': label, class: 'viz' });
  box.replaceChildren(svg);
  return { svg, w };
}

/** Redraws on width change only (draw-in animation runs on the first draw, not on resize). */
export function responsive(box: HTMLElement, draw: (animate: boolean) => void) {
  let last = 0;
  let first = true;
  new ResizeObserver(() => {
    const w = Math.round(box.clientWidth);
    if (w === last || w === 0) return;
    last = w;
    draw(first && !still());
    first = false;
  }).observe(box);
}

const usdShort = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K` : `$${Math.round(n)}`);

/** Single-series sparkline with an end-dot (stat-tile trend). */
export function sparkline(box: HTMLElement, values: number[], label: string, animate: boolean) {
  const h = 40;
  const { svg, w } = root(box, h, label);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const x = (i: number) => 4 + (i * (w - 8)) / (values.length - 1);
  const y = (v: number) => h - 6 - ((v - min) / (max - min || 1)) * (h - 12);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  el('path', { d, class: `viz-line${animate ? ' viz-draw' : ''}`, pathLength: 1, stroke: 'var(--spark)' }, svg);
  const i = values.length - 1;
  el('circle', { cx: x(i), cy: y(values[i]), r: 4, fill: 'var(--spark)', stroke: 'var(--spark-ring)', 'stroke-width': 2 }, svg);
}

export type Series = { key: string; label: string; color: string; values: number[] };

/** Multi-line chart with y ticks, sparse x labels, crosshair + tooltip on hover and arrow keys. */
export function lineChart(
  box: HTMLElement,
  tip: HTMLElement,
  series: Series[],
  labels: string[],
  label: string,
  animate: boolean,
) {
  const h = box.clientWidth < 480 ? 220 : 260;
  const { svg, w } = root(box, h, label);
  const pad = { t: 12, r: 16, b: 28, l: 44 };
  const max = Math.max(...series.flatMap((s) => s.values));
  const step = max > 1500 ? 500 : max > 600 ? 250 : 100;
  const top = Math.ceil(max / step) * step;
  const n = labels.length;
  const x = (i: number) => pad.l + (i * (w - pad.l - pad.r)) / (n - 1);
  const y = (v: number) => pad.t + (1 - v / top) * (h - pad.t - pad.b);

  for (let v = 0; v <= top; v += step) {
    el('line', { x1: pad.l, x2: w - pad.r, y1: y(v), y2: y(v), class: 'viz-grid' }, svg);
    el('text', { x: pad.l - 8, y: y(v) + 4, class: 'viz-tick', 'text-anchor': 'end' }, svg).textContent = usdShort(v);
  }
  const every = w < 480 ? 3 : 2;
  labels.forEach((l, i) => {
    if ((n - 1 - i) % every) return; // anchor on the latest month
    el('text', { x: x(i), y: h - 8, class: 'viz-tick', 'text-anchor': 'middle' }, svg).textContent = l;
  });

  const cross = el('line', { y1: pad.t, y2: h - pad.b, class: 'viz-cross', visibility: 'hidden' }, svg);
  series.forEach((s) => {
    const d = s.values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
    el('path', { d, class: `viz-line${animate ? ' viz-draw' : ''}`, pathLength: 1, stroke: s.color }, svg);
  });
  const dots = series.map((s) => {
    const i = n - 1;
    return el('circle', { cx: x(i), cy: y(s.values[i]), r: 4, fill: s.color, class: 'viz-dot' }, svg);
  });

  const show = (i: number | null) => {
    if (i == null) {
      cross.setAttribute('visibility', 'hidden');
      tip.hidden = true;
      dots.forEach((d, k) => {
        d.setAttribute('cx', String(x(n - 1)));
        d.setAttribute('cy', String(y(series[k].values[n - 1])));
      });
      return;
    }
    cross.setAttribute('x1', String(x(i)));
    cross.setAttribute('x2', String(x(i)));
    cross.setAttribute('visibility', 'visible');
    dots.forEach((d, k) => {
      d.setAttribute('cx', String(x(i)));
      d.setAttribute('cy', String(y(series[k].values[i])));
    });
    const total = series.reduce((a, s) => a + s.values[i], 0);
    tip.replaceChildren();
    const head = document.createElement('p');
    head.className = 'viz-tip__head';
    head.textContent = `${labels[i]} · $${total.toLocaleString('en-US')}`;
    tip.append(head);
    series.forEach((s) => {
      const row = document.createElement('p');
      const key = document.createElement('span');
      key.className = 'viz-key';
      key.style.background = s.color;
      row.append(key, `${s.label} $${s.values[i].toLocaleString('en-US')}`);
      tip.append(row);
    });
    tip.hidden = false;
    const left = Math.min(Math.max(x(i) - tip.offsetWidth / 2, 0), w - tip.offsetWidth);
    tip.style.left = `${left}px`;
  };

  let cur: number | null = null;
  const idx = (clientX: number) => {
    const r = svg.getBoundingClientRect();
    return Math.round(((clientX - r.left - pad.l) / (w - pad.l - pad.r)) * (n - 1));
  };
  svg.addEventListener('pointermove', (e) => show((cur = Math.min(n - 1, Math.max(0, idx(e.clientX))))));
  svg.addEventListener('pointerleave', () => show((cur = null)));
  box.onkeydown = (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const base = cur ?? n - 1;
    cur = e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : Math.min(n - 1, Math.max(0, base + (e.key === 'ArrowLeft' ? -1 : 1)));
    show(cur);
  };
  box.onblur = () => show((cur = null));
}

/** Daily columns: <=24px wide, 4px rounded tops, native <title> tooltip per column. */
export function columns(box: HTMLElement, values: number[], labels: string[], label: string, animate: boolean) {
  const h = 96;
  const { svg, w } = root(box, h, label);
  const max = Math.max(...values);
  const slot = w / values.length;
  const bw = Math.min(24, slot - 4);
  values.forEach((v, i) => {
    const bh = Math.max(2, (v / max) * (h - 20));
    const x = i * slot + (slot - bw) / 2;
    const r = Math.min(4, bw / 2);
    const top = h - 16 - bh;
    // rounded top corners, square at the baseline
    const d = `M${x},${h - 16}V${top + r}Q${x},${top} ${x + r},${top}H${x + bw - r}Q${x + bw},${top} ${x + bw},${top + r}V${h - 16}Z`;
    const p = el('path', { d, class: `viz-col${animate ? ' viz-grow' : ''}`, style: `animation-delay:${i * 30}ms` }, svg);
    el('title', {}, p).textContent = `${labels[i]}: ${v.toLocaleString('en-US')} visits`;
  });
  el('line', { x1: 0, x2: w, y1: h - 16, y2: h - 16, class: 'viz-grid' }, svg);
  el('text', { x: 0, y: h - 2, class: 'viz-tick' }, svg).textContent = labels[0];
  el('text', { x: w, y: h - 2, class: 'viz-tick', 'text-anchor': 'end' }, svg).textContent = labels[labels.length - 1];
}

/** Count-up for a number on load (instant under reduced motion). */
export function countUp(node: Element, to: number, fmt: (n: number) => string, ms = 900) {
  if (still() || to === 0) {
    node.textContent = fmt(to);
    return;
  }
  const t0 = performance.now();
  const tick = (t: number) => {
    const k = Math.min(1, (t - t0) / ms);
    const eased = 1 - Math.pow(1 - k, 3);
    node.textContent = fmt(k === 1 ? to : to * eased);
    if (k < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
