// Thai voice-over: one WAV per segment with macOS `say` (Kanya) + `afconvert`, then writes src/durations.json.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
const root = new URL('..', import.meta.url).pathname;
const lines = JSON.parse(readFileSync(root + 'src/script.json', 'utf8'));
const dir = root + 'public/voice/';
mkdirSync(dir, { recursive: true });
const out = {};
for (const { id, voice } of lines) {
  const aiff = `${dir}${id}.aiff`, wav = `${dir}${id}.wav`;
  execFileSync('say', ['-v', 'Kanya', '-r', process.env.RATE ?? '185', '-o', aiff, voice]);
  execFileSync('afconvert', ['-f', 'WAVE', '-d', 'LEI16@44100', aiff, wav]);
  rmSync(aiff);
  const secs = Number(/estimated duration: ([\d.]+)/.exec(execFileSync('afinfo', [wav], { encoding: 'utf8' }))[1]);
  if (!(secs > 0)) throw new Error('no audio for ' + id);
  out[id] = secs;
}
writeFileSync(root + 'src/durations.json', JSON.stringify(out, null, 1));
console.log(out, 'total voice', Object.values(out).reduce((a, b) => a + b, 0).toFixed(1), 's');
