/**
 * Tasteful, data-attribute driven GSAP motion. Call `initMotion()` once per page (safe to call again).
 *
 *   data-reveal                 fade + rise in when scrolled into view (once)
 *   data-reveal="left|right|fade|scale"   variant (default "up")
 *   data-reveal-delay="0.2"     extra delay in seconds
 *
 *   data-reveal-stagger         its direct children reveal one after another
 *   data-reveal-stagger="0.12"  stagger seconds (default 0.08)
 *
 *   data-count-to="1234"        count up from 0 when visible
 *     data-count-from="0"  data-count-decimals="0"  data-count-prefix="฿"  data-count-suffix="+"
 *     data-count-duration="1.6"
 *
 *   data-parallax="0.2"         scroll parallax; positive = moves slower than the page, negative = faster
 *
 *   Page-load intro:
 *     data-intro="header"       the site header slides down
 *     data-intro                hero text items rise in, staggered in DOM order
 *     data-intro-order="2"      optional explicit ordering
 *
 * Everything is skipped under prefers-reduced-motion (content stays fully visible, counters show final values).
 * Only transform + opacity are animated. Elements are never hidden by CSS, so if JS fails content still shows.
 */

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let ctx: gsap.Context | null = null;
let initialised = false;

const EASE = "power3.out"; // the GSAP twin of --ease-out
const REVEAL = 0.7; // seconds, one duration for every scroll reveal

function reducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function num(v: string | undefined, fallback: number): number {
  const n = v === undefined || v === "" ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function formatCount(el: HTMLElement, value: number): string {
  const decimals = num(el.dataset.countDecimals, 0);
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
  return `${el.dataset.countPrefix ?? ""}${formatted}${el.dataset.countSuffix ?? ""}`;
}

function revealFrom(variant: string | undefined): gsap.TweenVars {
  switch (variant) {
    case "left":
      return { autoAlpha: 0, x: -32 };
    case "right":
      return { autoAlpha: 0, x: 32 };
    case "fade":
      return { autoAlpha: 0 };
    case "scale":
      return { autoAlpha: 0, scale: 0.96, y: 12 };
    default:
      return { autoAlpha: 0, y: 24 };
  }
}

function setupIntro() {
  const header = document.querySelector<HTMLElement>('[data-intro="header"]');
  const items = Array.from(document.querySelectorAll<HTMLElement>("[data-intro]"))
    .filter((el) => el.dataset.intro !== "header")
    .sort((a, b) => num(a.dataset.introOrder, 0) - num(b.dataset.introOrder, 0));
  if (!header && !items.length) return;

  const tl = gsap.timeline({ defaults: { ease: EASE } });
  if (header) tl.from(header, { yPercent: -100, autoAlpha: 0, duration: 0.7, clearProps: "transform" }, 0);
  if (items.length)
    tl.from(items, { y: 24, autoAlpha: 0, duration: 0.9, stagger: 0.09, clearProps: "transform" }, header ? 0.15 : 0);
}

function setupReveals() {
  const els = gsap.utils.toArray<HTMLElement>("[data-reveal]");
  if (!els.length) return;
  for (const el of els) gsap.set(el, revealFrom(el.dataset.reveal));

  ScrollTrigger.batch(els, {
    start: "top 88%",
    once: true,
    onEnter: (batch) => {
      (batch as HTMLElement[]).forEach((el, i) => {
        gsap.to(el, {
          autoAlpha: 1,
          x: 0,
          y: 0,
          scale: 1,
          duration: REVEAL,
          ease: EASE,
          delay: num(el.dataset.revealDelay, 0) + i * 0.08,
          overwrite: "auto",
          clearProps: "transform",
        });
      });
    },
  });
}

function setupStaggers() {
  gsap.utils.toArray<HTMLElement>("[data-reveal-stagger]").forEach((parent) => {
    const kids = Array.from(parent.children) as HTMLElement[];
    if (!kids.length) return;
    gsap.from(kids, {
      autoAlpha: 0,
      y: 24,
      duration: REVEAL,
      ease: EASE,
      stagger: num(parent.dataset.revealStagger, 0.08),
      clearProps: "transform",
      scrollTrigger: { trigger: parent, start: "top 85%", once: true },
    });
  });
}

function setupCounters() {
  gsap.utils.toArray<HTMLElement>("[data-count-to]").forEach((el) => {
    const to = num(el.dataset.countTo, 0);
    const from = num(el.dataset.countFrom, 0);
    const obj = { v: from };
    el.textContent = formatCount(el, from);
    gsap.to(obj, {
      v: to,
      duration: num(el.dataset.countDuration, 1.6),
      ease: "power2.out",
      onUpdate: () => {
        el.textContent = formatCount(el, obj.v);
      },
      scrollTrigger: { trigger: el, start: "top 90%", once: true },
    });
  });
}

function setupParallax() {
  gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((el) => {
    const speed = num(el.dataset.parallax, 0.2);
    if (!speed) return;
    gsap.fromTo(
      el,
      { y: () => window.innerHeight * speed * 0.5 },
      {
        y: () => -window.innerHeight * speed * 0.5,
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
          invalidateOnRefresh: true,
        },
      },
    );
  });
}

/** Show final counter values without animation (reduced motion). */
function settleCounters() {
  document.querySelectorAll<HTMLElement>("[data-count-to]").forEach((el) => {
    el.textContent = formatCount(el, num(el.dataset.countTo, 0));
  });
}

export function initMotion(): void {
  if (typeof window === "undefined") return;
  if (initialised) return;
  initialised = true;

  if (reducedMotion()) {
    settleCounters();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  ctx = gsap.context(() => {
    setupIntro();
    setupReveals();
    setupStaggers();
    setupCounters();
    setupParallax();
  });

  // Late layout shifts (web fonts, images) move trigger positions.
  if (document.readyState !== "complete") {
    window.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });
  }
  document.fonts?.ready.then(() => ScrollTrigger.refresh()).catch(() => undefined);
}

/** Revert everything initMotion() created (e.g. before an Astro view-transition swap). */
export function destroyMotion(): void {
  ctx?.revert();
  ctx = null;
  initialised = false;
}
