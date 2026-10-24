import React from 'react';
import {
  AbsoluteFill, Audio, Easing, Sequence, Img, OffthreadVideo, interpolate, staticFile, useCurrentFrame, useVideoConfig,
} from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import script from './script.json';
import voice from './durations.json';
import clips from '../public/clips/clips.json';

// Brand tokens, copied from app/src/styles/tokens.css
export const C = {
  paper: '#f6f3ec', ink: '#10292b', ink2: '#4b5b5a', brand: '#0d6461', brandTint: '#d6ebe7',
  gold: '#e3a33a', night: '#0b1f21', nightSurface: '#12302f', nightInk: '#e9efec', nightInk2: '#9db3b0', nightBrand: '#5cc8be',
};
const DISPLAY = "'Bricolage Grotesque', 'Anuphan', sans-serif";
const BODY = "'Public Sans', 'Anuphan', sans-serif";
const THAI = "'Anuphan', 'Public Sans', sans-serif";

export const FPS = 30;
const T = 9; // 300 ms transitions
const OUT = Easing.bezier(0.23, 1, 0.32, 1); // strong ease-out (emil-design-eng)
const IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);

type Line = (typeof script)[number];
type Box = { x: number; y: number; w: number; h: number; from: number; to: number; label?: string };
type Zoom = { x: number; y: number; scale: number; from: number; to: number };

// Minimum on-screen seconds so the UI flow is readable even when the voice line is short.
const MIN: Record<string, number> = {
  intro: 5, problem: 8, home: 8.5, finder: 11.5, visa: 10.5, buddy: 10, business: 11, partner: 8, messages: 9.5, admin: 12, pricing: 8, end: 7,
};
// Callouts come from marks the recorder saved (box in 1440x810 capture space, t = clip seconds).
const LABELS: Record<string, string> = { paid: 'Payment status: confirmed', reply: 'Agency reply, same chat', checklist: 'Verification checklist → Approve' };
type Mark = { name: string; t: number; x: number; y: number; w: number; h: number };
type ClipMeta = { start: number; duration: number; marks?: Mark[] };

export const segSeconds = (l: Line) => Math.max((voice as Record<string, number>)[l.id] + 1.6, MIN[l.id] ?? 0);
export const totalFrames = (lines: Line[]) =>
  lines.reduce((a, l) => a + Math.round(segSeconds(l) * FPS), 0) - (lines.length - 1) * T;

const enter = (f: number, delay = 0, dur = 15) => interpolate(f - delay, [0, dur], [0, 1], { easing: OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

const LowerThird: React.FC<{ th: string; en: string; muted?: boolean }> = ({ th, en, muted }) => {
  const f = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const inP = enter(f, 10, 16);
  const outP = interpolate(f, [durationInFrames - 14, durationInFrames - 6], [0, 1], { easing: OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const p = inP * (1 - outP);
  return (
    <div style={{
      position: 'absolute', left: 64, bottom: 56, display: 'flex', alignItems: 'stretch', gap: 0,
      opacity: p, transform: `translateY(${(1 - p) * 24}px)`, filter: `blur(${(1 - p) * 4}px)`,
      borderRadius: 18, overflow: 'hidden', boxShadow: '0 18px 50px rgba(11,31,33,.35)',
    }}>
      <div style={{ width: 8, background: C.gold }} />
      <div style={{ background: 'rgba(11,31,33,.94)', padding: '18px 30px 20px 24px' }}>
        <div style={{ font: `700 22px/1.2 ${BODY}`, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.nightBrand, opacity: enter(f, 14, 14) }}>{en}</div>
        {!muted && <div style={{ font: `600 44px/1.35 ${THAI}`, color: C.nightInk, marginTop: 4, clipPath: `inset(0 ${(1 - enter(f, 16, 18)) * 100}% 0 0)` }}>{th}</div>}
      </div>
    </div>
  );
};

const Callout: React.FC<{ b: Box }> = ({ b }) => {
  const f = useCurrentFrame();
  const s = 1920 / 1440;
  const a = b.from * FPS, z = b.to * FPS;
  const p = interpolate(f, [a, a + 10, z - 8, z], [0, 1, 1, 0], { easing: OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (p === 0) return null;
  return (
    <div style={{
      position: 'absolute', left: b.x * s, top: b.y * s, width: b.w * s, height: b.h * s, borderRadius: 18,
      border: `5px solid ${C.gold}`, boxShadow: `0 0 0 9999px rgba(11,31,33,${0.32 * p})`,
      opacity: p, transform: `scale(${1.04 - 0.04 * p})`,
    }}>
      {b.label && <div style={{ position: 'absolute', top: -52, left: -5, background: C.gold, color: C.ink, font: `700 24px/1 ${BODY}`, padding: '12px 16px', borderRadius: 10 }}>{b.label}</div>}
    </div>
  );
};

const Clip: React.FC<{ l: Line; muted?: boolean }> = ({ l, muted }) => {
  const f = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const c = (clips as Record<string, ClipMeta>)[l.clip!];
  const segS = durationInFrames / FPS;
  const avail = c.duration - c.start - 0.2;
  // Fit the recorded action into the segment: speed up long clips, never slow below 0.8x.
  const rate = Math.min(2, Math.max(0.8, avail / segS));
  const boxes: Box[] = (c.marks ?? []).map((m) => {
    const from = m.t / rate, h = Math.min(m.h, 800 - m.y); // keep the box inside the capture
    return { x: m.x - 10, y: m.y - 10, w: m.w + 20, h: h + 20, from, to: Math.min(from + 4.5, segS - 0.4), label: LABELS[m.name] };
  });
  const zooms: Zoom[] = boxes.map((b) => {
    const scale = Math.min(1.14, 1400 / b.w, 790 / b.h);
    // Pick the fixed point of the zoom so the whole box stays on screen (p' = o + (p - o) * scale).
    const fit = (lo: number, hi: number, max: number) => {
      const c = (lo + hi) / 2;
      if (scale <= 1.001) return c;
      return Math.min(Math.max(c, (hi * scale - max) / (scale - 1)), (lo * scale) / (scale - 1));
    };
    return { x: fit(b.x, b.x + b.w, 1440), y: fit(b.y, b.y + b.h, 810), scale, from: b.from - 0.3, to: b.to };
  });
  // Slow push-in for life, plus a focus zoom on key moments.
  let scale = interpolate(f, [0, durationInFrames], [1, 1.035]);
  let ox = 720, oy = 405;
  for (const z of zooms) {
    const a = z.from * FPS, b = z.to * FPS;
    const p = interpolate(f, [a, a + 18, b - 12, b], [0, 1, 1, 0], { easing: IN_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    if (p > 0) { scale *= 1 + (z.scale - 1) * p; ox = 720 + (z.x - 720) * p; oy = 405 + (z.y - 405) * p; }
  }
  const s = 1920 / 1440;
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <AbsoluteFill style={{ transform: `scale(${scale})`, transformOrigin: `${ox * s}px ${oy * s}px` }}>
        <OffthreadVideo src={staticFile(`clips/${l.clip}.webm`)} startFrom={Math.round(c.start * FPS)} playbackRate={rate} muted style={{ width: 1920, height: 1080 }} />
        {boxes.map((b, k) => <Callout key={k} b={b} />)}
      </AbsoluteFill>
      <LowerThird th={l.th} en={l.en} muted={muted} />
    </AbsoluteFill>
  );
};

// Brand mark in full colour (same SVG as app/public/favicon.svg).
const Logo: React.FC<{ size: number; color?: string }> = ({ size }) => (
  <Img src={staticFile('logo.svg')} style={{ width: size, height: size }} />
);

const Intro: React.FC<{ l: Line }> = ({ l }) => {
  const f = useCurrentFrame();
  const a = enter(f, 4, 20), b = enter(f, 14, 20), c = enter(f, 26, 20);
  return (
    <AbsoluteFill style={{ background: C.night, alignItems: 'center', justifyContent: 'center' }}>
      <AbsoluteFill style={{ background: `radial-gradient(1000px 600px at 50% 40%, ${C.nightSurface}, ${C.night})` }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 36, opacity: a, transform: `translateY(${(1 - a) * 30}px) scale(${0.96 + 0.04 * a})` }}>
        <div style={{ width: 168, height: 168, borderRadius: 40, background: C.brand, display: 'grid', placeItems: 'center' }}><Logo size={120} color={C.gold} /></div>
        <div style={{ font: `800 150px/1 ${DISPLAY}`, color: C.nightInk, letterSpacing: '-0.03em' }}>Yoo Yaao</div>
      </div>
      <div style={{ font: `500 54px/1.3 ${DISPLAY}`, color: C.nightBrand, marginTop: 44, opacity: b, transform: `translateY(${(1 - b) * 20}px)` }}>
        Stay longer in Thailand, <span style={{ color: C.gold }}>legally</span>
      </div>
      <div style={{ font: `500 40px/1.4 ${THAI}`, color: C.nightInk2, marginTop: 18, opacity: c, transform: `translateY(${(1 - c) * 16}px)` }}>{l.th}</div>
    </AbsoluteFill>
  );
};

const PROBLEM = [
  ['Visa-free stay', '60 → 30 days'],
  ['Official DTV fee vs agent', '฿10,000 vs ฿50,000+'],
  ['Late 90-day report', '฿2,000 fine'],
];
const Problem: React.FC<{ l: Line }> = ({ l }) => {
  const f = useCurrentFrame();
  const h = enter(f, 4, 18);
  return (
    <AbsoluteFill style={{ background: C.paper, padding: '120px 160px', justifyContent: 'center' }}>
      <div style={{ font: `700 26px/1 ${BODY}`, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.brand, opacity: h }}>{l.en}</div>
      <div style={{ font: `600 64px/1.35 ${THAI}`, color: C.ink, marginTop: 20, maxWidth: 1500, opacity: h, transform: `translateY(${(1 - h) * 20}px)` }}>{l.th}</div>
      <div style={{ display: 'flex', gap: 32, marginTop: 70 }}>
        {PROBLEM.map(([k, v], i) => {
          const p = enter(f, 30 + i * 22, 18); // stagger, one card per spoken clause
          return (
            <div style={{ flex: 1, background: '#fff', borderRadius: 24, padding: '36px 40px', border: '1px solid #ddd7ca', opacity: p, transform: `translateY(${(1 - p) * 28}px)` }}>
              <div style={{ font: `500 28px/1.3 ${BODY}`, color: C.ink2 }}>{k}</div>
              <div style={{ font: `700 52px/1.15 ${DISPLAY}`, color: i === 2 ? '#b3261e' : C.ink, marginTop: 14 }}>{v}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const MODEL = [
  ['B2C', 'Pro $8/mo', C.brandTint, C.brand],
  ['B2B', 'Listing $49/mo', '#f5e6c8', '#845a0c'],
  ['C2C', 'Buddy 20%', '#f7dccf', '#9a3d22'],
];
const End: React.FC<{ l: Line }> = () => {
  const f = useCurrentFrame();
  const a = enter(f, 4, 20), u = enter(f, 16, 20);
  return (
    <AbsoluteFill style={{ background: C.night, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 26, opacity: a, transform: `translateY(${(1 - a) * 24}px)` }}>
        <div style={{ width: 110, height: 110, borderRadius: 28, background: C.brand, display: 'grid', placeItems: 'center' }}><Logo size={78} color={C.gold} /></div>
        <div style={{ font: `800 104px/1 ${DISPLAY}`, color: C.nightInk, letterSpacing: '-0.03em' }}>Yoo Yaao</div>
      </div>
      <div style={{ font: `600 58px/1 ${BODY}`, color: C.gold, marginTop: 50, opacity: u, transform: `translateY(${(1 - u) * 18}px)` }}>yoo-yaao.vercel.app</div>
      <div style={{ display: 'flex', gap: 22, marginTop: 64 }}>
        {MODEL.map(([seg, txt, bg, fg], i) => {
          const p = enter(f, 34 + i * 6, 16);
          return (
            <div key={seg} style={{ background: bg, color: fg, borderRadius: 999, padding: '18px 32px', font: `700 34px/1 ${BODY}`, opacity: p, transform: `translateY(${(1 - p) * 16}px)` }}>
              {seg} <span style={{ color: C.ink, fontWeight: 600 }}>· {txt}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const Scene: React.FC<{ l: Line; muted?: boolean }> = ({ l, muted }) =>
  l.id === 'intro' ? <Intro l={l} /> : l.id === 'problem' ? <Problem l={l} /> : l.id === 'end' ? <End l={l} /> : <Clip l={l} muted={muted} />;

export const Demo: React.FC<{ ids?: string[]; muted?: boolean }> = ({ ids, muted }) => {
  const lines = ids ? script.filter((l) => ids.includes(l.id)) : script;
  return (
    <AbsoluteFill style={{ background: C.night }}>
      <TransitionSeries>
        {lines.flatMap((l, i) => {
          const dur = Math.round(segSeconds(l) * FPS);
          const seq = (
            <TransitionSeries.Sequence key={l.id} durationInFrames={dur}>
              <Scene l={l} muted={muted} />
              {/* voice starts after the incoming transition so lines never overlap */}
              {!muted && <Sequence from={i === 0 ? 4 : T}><Audio src={staticFile(`voice/${l.id}.wav`)} /></Sequence>}
            </TransitionSeries.Sequence>
          );
          if (i === 0) return [seq];
          const titleCard = l.clip === null || lines[i - 1].clip === null;
          return [
            <TransitionSeries.Transition key={l.id + '-t'} presentation={titleCard ? slide({ direction: 'from-right' }) : fade()} timing={linearTiming({ durationInFrames: T, easing: IN_OUT })} />,
            seq,
          ];
        })}
      </TransitionSeries>
    </AbsoluteFill>
  );
};
