import React from 'react';
import { Composition, continueRender, delayRender, staticFile } from 'remotion';
import { Demo, FPS, totalFrames } from './Demo';
import script from './script.json';

// Load brand fonts once before any frame renders.
const fonts: [string, string, string][] = [
  ['Bricolage Grotesque', 'bricolage-grotesque-latin-wght-normal.woff2', '200 800'],
  ['Public Sans', 'public-sans-latin-wght-normal.woff2', '100 900'],
  ['Anuphan', 'anuphan-thai-wght-normal.woff2', '100 700'],
  ['Anuphan', 'anuphan-latin-wght-normal.woff2', '100 700'],
];
const handle = delayRender('fonts');
Promise.all(fonts.map(([family, file, weight]) => new FontFace(family, `url(${staticFile('fonts/' + file)})`, { weight }).load().then((f) => document.fonts.add(f))))
  .then(() => continueRender(handle));

// Muted website loop: screen segments only, English keywords, no voice.
const LOOP = ['home', 'finder', 'buddy', 'business', 'admin'];

export const Root: React.FC = () => (
  <>
    <Composition id="Demo" component={Demo} fps={FPS} width={1920} height={1080} durationInFrames={totalFrames(script)} defaultProps={{}} />
    <Composition id="Loop" component={Demo} fps={FPS} width={1920} height={1080}
      durationInFrames={totalFrames(script.filter((l) => LOOP.includes(l.id)))} defaultProps={{ ids: LOOP, muted: true }} />
  </>
);
