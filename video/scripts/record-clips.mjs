// Records one clean screen clip per video segment: node scripts/record-clips.mjs [baseUrl] [only-id]
// Needs the site running (cd app && npx astro dev --port 4321). Uses system Chrome via app/'s Playwright.
// Writes public/clips/<id>.webm and public/clips/clips.json ({id: {start, duration}} in seconds, start = first ready frame).
import { chromium } from '../../app/node_modules/playwright/index.mjs';
import { existsSync } from 'node:fs';
import { mkdir, rename, readdir, rm, readFile, writeFile } from 'node:fs/promises';

const BASE = process.argv[2] ?? 'http://localhost:4321';
const ONLY = process.argv[3];
const OUT = new URL('../public/clips/', import.meta.url).pathname;
const W = 1440, H = 810; // scaled to 1920x1080 in Remotion; bigger UI text than a native 1080p capture

// Fake cursor: headless video has no pointer, so draw one that follows mouse events.
const CURSOR = `addEventListener('DOMContentLoaded', () => {
  const c = document.createElement('div');
  c.style.cssText = 'position:fixed;left:0;top:0;width:22px;height:22px;z-index:2147483647;pointer-events:none;transform:translate(-100px,-100px);transition:scale .12s ease-out';
  c.innerHTML = '<svg width="22" height="22" viewBox="0 0 22 22"><path d="M3 2l15 8-6.5 1.6L8.6 18z" fill="#10292b" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  document.body.appendChild(c);
  addEventListener('mousemove', (e) => { c.style.transform = 'translate(' + (e.clientX - 3) + 'px,' + (e.clientY - 2) + 'px)'; }, true);
  addEventListener('mousedown', () => { c.style.scale = '0.85'; }, true);
  addEventListener('mouseup', () => { c.style.scale = '1'; }, true);
});`;

// Chrome's new headless mode pads screencast frames with a grey band; the old-style headless shell
// that Remotion downloads into node_modules/.remotion does not. Fall back to system Chrome without it.
const SHELL = new URL('../node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell', import.meta.url).pathname;
const browser = await chromium.launch(existsSync(SHELL) ? { executablePath: SHELL } : { channel: 'chrome' });
const meta = JSON.parse(await readFile(OUT + 'clips.json', 'utf8').catch(() => '{}'));

async function clip(id, fn) {
  if (ONLY && ONLY !== id) return;
  const tmp = `${OUT}.rec-${id}/`;
  await rm(tmp, { recursive: true, force: true });
  await mkdir(tmp, { recursive: true });
  const ctx = await browser.newContext({ colorScheme: 'light', reducedMotion: 'no-preference', viewport: { width: W, height: H }, recordVideo: { dir: tmp, size: { width: W, height: H } } });
  await ctx.addInitScript(CURSOR);
  const page = await ctx.newPage();
  const t0 = Date.now();
  let start = 0;
  const marks = [];
  const wait = (ms) => page.waitForTimeout(ms);
  let mx = W / 2, my = H / 2;
  const api = {
    page, wait,
    async go(path, first = false) {
      await page.goto(BASE + path, { waitUntil: 'networkidle' });
      await page.mouse.move(mx, my);
      await wait(700);
      if (first) start = (Date.now() - t0) / 1000;
    },
    async move(loc, ms = 600) {
      await loc.scrollIntoViewIfNeeded();
      const b = await loc.boundingBox();
      const x = b.x + b.width / 2, y = b.y + b.height / 2;
      const steps = Math.max(8, Math.round(ms / 16));
      // ease-in-out path so the pointer glides rather than jumps
      for (let i = 1; i <= steps; i++) {
        const t = i / steps, e = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
        await page.mouse.move(mx + (x - mx) * e, my + (y - my) * e);
      }
      mx = x; my = y;
    },
    async click(loc, ms) { await api.move(loc, ms); await wait(150); await page.mouse.down(); await page.mouse.up(); },
    // Remember where a key UI element is (1440x810 space) and when (seconds after `start`), for Remotion callouts.
    async mark(name, ...locs) {
      const bs = await Promise.all(locs.map((l) => l.boundingBox()));
      const x = Math.min(...bs.map((b) => b.x)), y = Math.min(...bs.map((b) => b.y));
      const r = Math.max(...bs.map((b) => b.x + b.width)), btm = Math.max(...bs.map((b) => b.y + b.height));
      marks.push({ name, t: +((Date.now() - t0) / 1000 - start).toFixed(2), x: Math.round(x), y: Math.round(y), w: Math.round(r - x), h: Math.round(btm - y) });
    },
    async center(loc) { await loc.evaluate((e) => e.scrollIntoView({ behavior: 'smooth', block: 'center' })); await wait(900); },
    async scroll(px, ms = 2000) {
      const steps = Math.round(ms / 30);
      for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, px / steps); await wait(30); }
    },
  };
  await fn(api);
  const duration = (Date.now() - t0) / 1000;
  await ctx.close();
  const [file] = (await readdir(tmp)).filter((f) => f.endsWith('.webm'));
  await rename(tmp + file, `${OUT}${id}.webm`);
  await rm(tmp, { recursive: true, force: true });
  meta[id] = { start: +start.toFixed(2), duration: +duration.toFixed(2), marks };
  await writeFile(OUT + 'clips.json', JSON.stringify(meta, null, 1));
  console.log(id, meta[id]);
}

await clip('home', async ({ go, wait, scroll }) => {
  await go('/', true);
  await wait(2200);
  await scroll(1500, 3000);
  await wait(600);
  await scroll(1400, 3000);
  await wait(1200);
});

await clip('finder', async ({ page, go, wait, click }) => {
  await go('/finder', true);
  await wait(600);
  await click(page.locator('label.f-card', { hasText: 'Remote work' }));
  await wait(500);
  const next = page.locator('[data-next]');
  await click(next); await wait(700);                                    // nationality: keep default
  await click(next); await wait(700);                                    // stay length
  await click(page.locator('[data-fill="days"]').last()); await wait(400);
  await click(next); await wait(700);                                    // age
  await click(next); await wait(700);                                    // income
  await click(page.locator('[data-fill="income"]').nth(2)); await wait(400);
  await click(next); await wait(700);                                    // savings
  await click(page.locator('[data-fill="savings"]').last()); await wait(400);
  await click(next);
  await wait(3500);
});

await clip('visa', async ({ page, go, wait, scroll, click }) => {
  await go('/visas/dtv', true);
  await wait(1800);
  await scroll(1100, 2600);
  await wait(800);
  await go('/tools/90-day');
  const d = page.locator('input[type="date"]').first();
  await click(d);
  await d.fill('2026-08-20');
  await d.dispatchEvent('change');
  await wait(1200);
  await scroll(450, 1600);
  await wait(1800);
});

await clip('buddy', async ({ page, go, wait, scroll, move, mark }) => {
  await go('/buddies/demo-ploy-bkk', true);
  await wait(1500);
  await scroll(500, 1500);
  await move(page.locator('[data-book] button[type="submit"]'), 800); // hover only: submitting would start a real checkout
  await wait(600);
  await go('/checkout/status?demo=1&product=buddy_session&buddy=demo-ploy-bkk');
  const paid = page.locator('[data-state="paid"]');
  await paid.waitFor({ state: 'visible' });
  await wait(400);
  await mark('paid', paid);
  await wait(3800);
});

await clip('business', async ({ page, go, wait, scroll, click }) => {
  await go('/business', true);
  await wait(1500);
  await scroll(700, 1600);
  await go('/business/apply?plan=agent');
  await click(page.locator('#p-name'));
  await page.keyboard.type('Chiang Mai Visa Co.', { delay: 45 });
  await page.locator('#p-city').selectOption({ index: 2 });
  await wait(300);
  await click(page.locator('#p-licence'));
  await page.keyboard.type('TAT 11/09876', { delay: 60 });
  await wait(1000);
  await go('/business/verify');
  await wait(1200);
  await scroll(600, 1600);
  await wait(800);
});

await clip('partner', async ({ page, go, wait, click }) => {
  await go('/partner/leads', true);
  await wait(1800);
  await click(page.locator('[data-chat]').first(), 800);
  await page.waitForURL('**/partner/messages**');
  await wait(800);
  await wait(3500);
});

await clip('messages', async ({ page, go, wait, click, mark }) => {
  await go('/messages', true);
  await wait(1200);
  const input = page.locator('[data-chat] textarea');
  await input.evaluate((e) => e.closest('[data-chat]').scrollIntoView({ behavior: 'smooth', block: 'end' }));
  await wait(900);
  await click(input);
  await page.keyboard.type('Can we do tomorrow at 10:00?', { delay: 55 });
  await wait(400);
  await page.keyboard.press('Enter');
  const reply = page.locator('[data-id^="demo-reply-"]').last();
  await reply.waitFor({ state: 'visible' });
  await wait(500);
  await mark('reply', reply);
  await wait(3500);
});

await clip('admin', async ({ page, go, wait, scroll, click, mark }) => {
  await go('/admin', true);
  await wait(2600);
  await scroll(450, 1400);
  await wait(500);
  await go('/admin/applications');
  const row = page.locator('[data-panel="listing-apps"] tr', { hasText: 'Chao Phraya' }).first();
  await click(row.locator('[data-toggle]'));
  await wait(700);
  const id = page.locator('[data-chk="identity"]:visible'), lic = page.locator('[data-chk="license"]:visible');
  const approve = page.locator('[data-approve]:visible');
  // bottom-align Approve so the checklist above it and the button share one frame
  await approve.evaluate((e) => e.scrollIntoView({ behavior: 'smooth', block: 'end' }));
  await wait(700);
  await page.mouse.wheel(0, 30);
  await wait(400);
  // the demo row may already have a box ticked; only tick what is still empty
  for (const box of [id, lic]) if (!(await box.isChecked())) { await click(box); await wait(450); }
  await mark('checklist', id.locator('xpath=ancestor::fieldset[1]'), approve);
  await wait(700);
  await click(approve);
  await wait(2600);
});

await clip('pricing', async ({ go, wait, scroll }) => {
  await go('/pricing', true);
  await wait(1500);
  await scroll(900, 2500);
  await wait(2500);
});

await browser.close();
