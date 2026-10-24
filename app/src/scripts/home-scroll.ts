/**
 * Home page scroll story (docs/home-scroll.md).
 *
 * - >= 640px and motion allowed: <html class="home-story">, pinned scenes, and the single 3D
 *   stage (hero3d story mode) is driven through `hero.pose` from scroll keyframes per scene.
 * - < 640px: no pins; reveals, count-ups and SVG draws only. The 3D hero stays in the hero card.
 * - Scenes pin while their scrubbed animation runs, so content is complete before they scroll away.
 * - prefers-reduced-motion or no JS: plain stacked sections (nothing here hides content).
 */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { mountHero, DEFAULT_POSE, type HeroHandle, type HeroPose } from "./hero3d";
import { initMotion } from "./motion";

type Pose = Partial<HeroPose>;

/**
 * Where the 3D object is while each scene is on screen. A pair = [scene enters, scene leaves].
 * It shows in hero, blueprint (wireframe, above the timeline) and finale; elsewhere it is hidden (opacity 0) and parked one
 * screen above or below its next visible spot, so it scrolls in and out with the content as it fades.
 */
const HERO: Pose = { x: 0.26, y: -0.02, scale: 0.85 }; // right half: the headline owns the left
const FINALE: Pose = { x: 0, y: 0.3, scale: 0.34, spin: 0.35 }; // the band above the wordmark
const BLUEPRINT: Pose = { x: 0.24, y: 0.17, scale: 0.5, lift: 1, glow: 0.6, wire: 1, spin: 0.2 }; // right half, above the timeline
const away = (p: Pose, dy: number): Pose => ({ ...p, y: (p.y ?? 0) + dy, opacity: 0 });
const POSES: Record<string, Pose | [Pose, Pose]> = {
  hero: HERO,
  sweep: away(HERO, 1),
  problem: away(FINALE, -1),
  visas: away(FINALE, -1),
  blueprint: BLUEPRINT,
  cities: away(FINALE, -1),
  buddies: away(FINALE, -1),
  demo: away(FINALE, -1),
  trust: away(FINALE, -1),
  plans: away(FINALE, -1),
  faq: away(FINALE, -1),
  finale: [FINALE, away(FINALE, 0.6)], // gone before the footer
};

const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) =>
  Array.from(root.querySelectorAll<T>(sel));

/** Pin a one-screen scene while the scroll scrubs its animation. */
const HOLD = { start: "top top", end: "+=80%", pin: true, scrub: 0.5 } as const; // 0.5s catch-up smooths wheel steps

let started = false;

export function initHomeScroll(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  gsap.registerPlugin(ScrollTrigger);

  // Stat values count up (motion.ts handles data-count-to; Stat renders the number in .stat__num).
  for (const n of $$("[data-stat-count] .stat__num")) n.dataset.countTo = n.textContent?.trim() ?? "";

  const mm = gsap.matchMedia();
  mm.add(
    {
      story: "(min-width: 640px) and (prefers-reduced-motion: no-preference)",
      motion: "(prefers-reduced-motion: no-preference)",
    },
    (ctx) => {
      const { story, motion } = ctx.conditions as { story: boolean; motion: boolean };
      if (!motion) return;
      const root = document.documentElement;
      if (story) {
        root.classList.add("home-story");
        // Scenes that fit one screen pin while their scrubbed animation runs, so the scene stays put
        // until its content is complete. light scrub (0.5s); Cities is taller than a screen, so it never pins.
        sweepScene();
        problemScene();
        visasScene();
      }
      blueprintScene(story);
      finaleScene();
      if (story) sceneSnap(); // last: it measures the pins above
      return () => root.classList.remove("home-story");
    },
  );

  // Reveals, intro and count-ups (all no-ops under reduced motion). After the pins, on purpose.
  initMotion();

  const stage = $("[data-hero-story]");
  if (stage) {
    const hero = mountHero(stage);
    hero.ready.then((ok) => {
      if (ok && hero.story) drivePose(hero);
    });
  }
}

// ---------------------------------------------------------------- scenes

function sweepScene() {
  const scene = $('[data-scene="sweep"]');
  if (!scene) return;
  const left = $("[data-sweep='left']", scene);
  const right = $("[data-sweep='right']", scene);
  const tl = gsap.timeline({
    defaults: { ease: "power2.out" },
    scrollTrigger: { trigger: scene, start: "top top", end: "+=80%", pin: true, scrub: 0.5, invalidateOnRefresh: true },
  });
  // Lines slide in from opposite sides and land whole, then hold for the last third of the pin.
  if (left) tl.from(left, { x: () => -window.innerWidth * 0.25 }, 0);
  if (right) tl.from(right, { x: () => window.innerWidth * 0.25 }, 0);
  tl.to({}, { duration: 0.5 });
}

function problemScene() {
  const scene = $('[data-scene="problem"]');
  const cards = $$(".pain", scene ?? document);
  if (!scene || !cards.length || !matchMedia("(min-width: 60rem)").matches) return;
  gsap
    .timeline({ scrollTrigger: { trigger: scene, ...HOLD } })
    .from(cards, {
      y: 160,
      autoAlpha: 0,
      rotation: (i: number) => [5, -4, 6][i % 3],
      stagger: 0.35,
      ease: "power2.out",
    })
    .to({}, { duration: 0.4 }); // hold the finished scene before it scrolls away
}

function visasScene() {
  const scene = $('[data-scene="visas"]');
  const cards = $$(".vcard", scene ?? document);
  if (!scene || !cards.length) return;
  const mid = (cards.length - 1) / 2;
  const spread = () => cards[0].offsetWidth + 16; // a gap between neighbours: no title is ever covered
  gsap.set(cards, { x: 0, y: (i: number) => -i * 5, rotation: (i: number) => (i - mid) * 2 });
  gsap
    .timeline({
      scrollTrigger: { trigger: scene, ...HOLD, invalidateOnRefresh: true },
    })
    .to(cards, {
      x: (i: number) => (i - mid) * spread(),
      y: (i: number) => Math.abs(i - mid) * -12, // gentle arc: outer cards rise a little
      rotation: (i: number) => (i - mid) * -2.5,
      stagger: 0.06,
      ease: "power2.inOut",
    });
}

function blueprintScene(story: boolean) {
  const scene = $('[data-scene="blueprint"]');
  const line = $<SVGPathElement>("[data-bp-line]", scene ?? document);
  if (!scene || !line) return;
  const marks = $$<SVGGElement>("[data-bp-mark]", scene);
  const ticks = $$(".bp__tick", scene);
  gsap.set(line, { attr: { "stroke-dasharray": 1, "stroke-dashoffset": 1 } });
  const st: ScrollTrigger.Vars = { trigger: scene, ...(story ? HOLD : { start: "top 85%", end: "top 35%", scrub: true }) };
  gsap
    .timeline({ scrollTrigger: st })
    .to(line, { attr: { "stroke-dashoffset": 0 }, ease: "none", duration: 1 }, 0)
    .from(marks, { autoAlpha: 0, scale: 0.3, transformOrigin: "50% 50%", stagger: 0.2, duration: 0.2 }, 0)
    .from(ticks, { scale: 0, autoAlpha: 0, stagger: 0.2, duration: 0.25, ease: "back.out(2)" }, 0.2)
    .to({}, { duration: 0.4 });
}


function finaleScene() {
  const word = $<SVGTextElement>("[data-finale-word]");
  if (!word) return;
  gsap.set(word, { strokeDasharray: 2400, strokeDashoffset: 2400 });
  gsap.to(word, {
    strokeDashoffset: 0,
    ease: "none",
    scrollTrigger: { trigger: word, start: "top 95%", end: "bottom 45%", scrub: 0.8 },
  });
}

// ---------------------------------------------------------------- scene snap

/**
 * Locks scrolling scene by scene: when the wheel/trackpad stops, the page settles on the next
 * scene in the scroll direction, so nothing is left half on screen. A scene taller than the
 * viewport scrolls freely inside (top and bottom are both snap points); a pin snaps to its start/end.
 */
function sceneSnap() {
  let points: number[] = []; // scroll px
  let free: [number, number][] = []; // ranges with no snap (inside tall scenes)
  let max = 1;

  function measure() {
    const vh = window.innerHeight;
    const head = $("header")?.offsetHeight ?? 0;
    max = ScrollTrigger.maxScroll(window) || 1;
    points = [0, max];
    free = [];
    for (const el of $$("[data-scene]")) {
      const box = el.parentElement?.classList.contains("pin-spacer") ? el.parentElement : el;
      const top = box.getBoundingClientRect().top + window.scrollY;
      const pinned = box !== el;
      const start = Math.max(0, top - (pinned || top === 0 ? 0 : head)); // heading clears the glass header
      const end = top + box.offsetHeight - vh;
      points.push(start);
      if (end > start + 40) {
        points.push(end);
        free.push([start + 2, end - 2]); // inside a pin the scroll drives the animation: never snap there
      }
    }
    points = [...new Set(points.map((p) => Math.round(Math.min(p, max))))].sort((a, b) => a - b);
  }

  ScrollTrigger.create({
    start: 0,
    end: "max",
    refreshPriority: -1, // refresh after every pin so its spacer is measured at full size
    onRefresh: measure,
    snap: {
      snapTo: (progress, self) => {
        const y = progress * max;
        if (free.some(([a, b]) => y > a && y < b)) return progress;
        const dir = self?.direction ?? 1;
        // Next point in the scroll direction; a nudge under 8% of a screen springs back instead.
        const nudge = window.innerHeight * 0.08;
        const back = dir > 0 ? [...points].reverse().find((p) => p <= y) : points.find((p) => p >= y);
        const fwd = dir > 0 ? points.find((p) => p > y) : [...points].reverse().find((p) => p < y);
        const pick = back !== undefined && (fwd === undefined || Math.abs(y - back) < nudge) ? back : fwd ?? y;
        return pick / max;
      },
      duration: { min: 0.4, max: 0.9 },
      delay: 0.15, // let trackpad momentum finish first
      ease: "sine.inOut",
      inertia: false,
    },
  });
  measure();
}

// ---------------------------------------------------------------- 3D pose driver

interface Key {
  at: number;
  pose: HeroPose;
}

function drivePose(hero: HeroHandle) {
  let keys: Key[] = [];
  const full = (p: Pose): HeroPose => ({ ...DEFAULT_POSE, ...p });

  function measure() {
    const vh = window.innerHeight;
    const max = document.documentElement.scrollHeight - vh;
    const next: Key[] = [];
    for (const [name, def] of Object.entries(POSES)) {
      const el = $(`[data-scene="${name}"]`);
      if (!el) continue;
      const box = el.parentElement?.classList.contains("pin-spacer") ? el.parentElement : el;
      const top = box.getBoundingClientRect().top + window.scrollY;
      const [enter, leave] = Array.isArray(def) ? def : [def, def];
      // Pose is exact while the scene fills the screen: from its top at the viewport top until its
      // bottom reaches the viewport bottom (= pin start / pin end for pinned scenes).
      // A pair's leave pose lands when 40% of the next content has scrolled in.
      const a = Math.min(top, max);
      const b = Math.min(top + box.offsetHeight - vh * (Array.isArray(def) ? 0.4 : 1), max);
      next.push({ at: a, pose: full(enter) }, { at: Math.max(a + 1, b), pose: full(leave) });
    }
    keys = next.sort((p, q) => p.at - q.at);
  }

  function apply() {
    if (!keys.length) return;
    const y = window.scrollY;
    let i = 0;
    while (i < keys.length - 1 && keys[i + 1].at <= y) i++;
    const a = keys[i];
    const b = keys[Math.min(i + 1, keys.length - 1)];
    const span = b.at - a.at;
    const raw = span > 0 ? Math.min(1, Math.max(0, (y - a.at) / span)) : 0;
    const t = raw * raw * (3 - 2 * raw); // smoothstep
    for (const k of Object.keys(hero.pose) as (keyof HeroPose)[]) hero.pose[k] = a.pose[k] + (b.pose[k] - a.pose[k]) * t;
  }

  ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: apply,
    onRefresh: () => {
      measure();
      apply();
    },
  });
  measure();
  apply();
}

initHomeScroll();
