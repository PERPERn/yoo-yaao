// Records the product demo video: node scripts/record-demo.mjs [baseUrl]
// Needs the site running (npx astro dev --port 4321) and Chrome installed. Writes public/media/demo.webm.
// Uses system Chrome (channel "chrome"), so no browser download is needed.
import { chromium } from 'playwright';
import { mkdir, rename, readdir, rm } from 'node:fs/promises';

const BASE = process.argv[2] ?? 'http://localhost:4321';
const OUT = process.env.OUT ?? new URL('../public/media/', import.meta.url).pathname;
const TMP = OUT + '.rec/';
const W = 1280, H = 720;

await rm(TMP, { recursive: true, force: true }); // a failed run leaves a partial .webm behind
await mkdir(TMP, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ colorScheme: 'dark', viewport: { width: W, height: H }, recordVideo: { dir: TMP, size: { width: W, height: H } } });
const page = await ctx.newPage();
const wait = (ms) => page.waitForTimeout(ms);

// Caption bar so the video explains the concept without a voice-over.
async function caption(step, text) {
  await page.evaluate(([step, text]) => {
    let el = document.getElementById('demo-cap');
    if (!el) {
      el = document.createElement('div');
      el.id = 'demo-cap';
      el.style.cssText =
        'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:99999;max-width:880px;padding:14px 22px;border-radius:14px;' +
        'background:rgba(8,24,26,.88);color:#eef5f2;font:600 20px/1.35 system-ui,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.45);' +
        'border:1px solid rgba(94,214,190,.35);backdrop-filter:blur(8px);text-align:center;pointer-events:none';
      document.body.appendChild(el);
    }
    el.innerHTML = `<span style="color:#f2b84b;margin-right:10px">${step}</span>${text}`;
  }, [step, text]);
}
async function smoothScroll(px, ms = 2500) {
  const steps = Math.round(ms / 40);
  for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, px / steps); await wait(40); }
}
async function go(path) {
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  await wait(600);
}

// 1. The problem + the promise
await go('/');
await caption('Yoo Yaao', 'Stay longer in Thailand — the right visa, the exact checklist, no missed reports.');
await wait(3500);
await smoothScroll(2600, 4000);
await caption('The problem', 'Thai visa rules changed 4+ times since 2024. Blogs disagree.');
await smoothScroll(1800, 3500);
await caption('The idea', 'Five official visa routes, matched to you in 60 seconds.');
await smoothScroll(1600, 3500);

// 2. Visa Finder
await go('/finder');
await caption('Step 1 · Visa Finder', 'Six quick questions. Answers stay in your browser.');
await wait(1500);
await wait(900);
await page.locator('label.f-card', { hasText: 'Remote work' }).click();
await wait(700);
const next = page.locator('[data-next]');
await next.click(); await wait(900);                        // nationality: keep default
await next.click(); await wait(900);                        // stay length
await page.locator('[data-fill="days"]').last().click(); await wait(500);
await next.click(); await wait(900);                        // age
await next.click(); await wait(900);                        // income
await page.locator('[data-fill="income"]').nth(2).click(); await wait(500);
await next.click(); await wait(900);                        // savings
await page.locator('[data-fill="savings"]').last().click(); await wait(500);
await caption('Step 2 · Result', 'Your best visa, why you qualify, and the official source for every rule.');
await next.click();
await wait(2500);
await smoothScroll(700, 2500);
await wait(1500);

// 3. Stay tools
await go('/tools/90-day');
await caption('Step 3 · Stay legal', 'Every 90-day report on one timeline, with a reminder before each deadline.');
await page.locator('input[type="date"]').first().fill('2026-08-20');
await page.locator('input[type="date"]').first().dispatchEvent('change');
await wait(1200);
await smoothScroll(500, 2000);
await wait(1800);

// 4. Local Buddies (C2C) + payment status
await go('/buddies/demo-ploy-bkk');
await caption('Step 4 · Local Buddies', 'Locals help with viewings, banks and SIMs — the platform earns 20%.');
await wait(3000);
await go('/checkout/status?demo=1&product=listing_featured');
await caption('Step 5 · Payment status', 'Clear status at every step: plan → payment → confirmed. (Demo: nothing is charged.)');
await wait(5000);

// 5. Business view
await go('/pricing');
await caption('Business model', 'B2C Pro $8/mo · B2B listings $49/mo + expert leads · C2C buddy sessions.');
await wait(2500);
await smoothScroll(900, 3000);
await go('/revenue');
await caption('Revenue', 'Every sign-up and payment flows into one revenue dashboard.');
await wait(4000);

await ctx.close();
await browser.close();
const [file] = (await readdir(TMP)).filter((f) => f.endsWith('.webm'));
await rename(TMP + file, OUT + 'demo.webm');
await rm(TMP, { recursive: true, force: true });
console.log('wrote', OUT + 'demo.webm');
