// Screens of the home stage, from the dev server on :4321. Run: node blender/shots.mjs <out_dir> [width height]
import { chromium } from '../app/node_modules/playwright/index.mjs';
const [out, w = 1440, h = 900] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: +w, height: +h }, hasTouch: +w < 700, isMobile: +w < 700 });
p.on('pageerror', (e) => console.log('ERR', e.message));
p.on('console', (m) => m.type() === 'error' && console.log('console', m.text().slice(0, 200)));
await p.goto('http://localhost:4321/', { waitUntil: 'load' });
await p.waitForTimeout(2500);
const snap = (n) => p.screenshot({ path: `${out}/${w}-${n}.png` });
await snap('wall');
if (+w >= 960) {
  for (const s of ['dtv', 'privilege']) {
    await p.click(`[data-spot=${s}]`);
    await p.waitForTimeout(2600);
    await snap(s);
    await p.keyboard.press('Escape');
    await p.waitForTimeout(2600);
    console.log(s, 'closed', await p.evaluate(() => [document.querySelector('.wall').dataset.phase, document.activeElement?.dataset.spot].join()));
  }
}
await p.evaluate(() => document.querySelector('.map').scrollIntoView({ behavior: 'instant' }));
await p.waitForTimeout(2500);
await snap('map');
for (const c of ['bangkok', 'chiang-mai', 'phuket']) {
  await p.click(`[data-spot=${c}]`);
  await p.waitForTimeout(3600);
  await snap('map-' + c);
  await p.click('.map [data-stage-back]');
  await p.waitForTimeout(3000);
}
console.log('scrollW', await p.evaluate(() => document.documentElement.scrollWidth));
process.exit(0);
