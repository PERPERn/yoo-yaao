// Renders review stills: node scripts/stills.mjs <outDir> <frame> [frame...]  (frames of the Demo composition)
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
const [outDir, ...frames] = process.argv.slice(2);
const serveUrl = await bundle({ entryPoint: new URL('../src/index.ts', import.meta.url).pathname });
const composition = await selectComposition({ serveUrl, id: process.env.COMP ?? 'Demo' });
for (const f of frames) {
  await renderStill({ serveUrl, composition, frame: +f, output: `${outDir}/still-${f}.jpg`, imageFormat: 'jpeg', scale: Number(process.env.SCALE ?? 0.5) });
  console.log(`${outDir}/still-${f}.jpg`);
}
