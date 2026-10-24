/**
 * 3D hero: passport + floating Thai island (modelled in Blender, /models/hero.glb).
 *
 * Usage:
 *   <div data-hero-3d style="aspect-ratio: 4 / 3"></div>
 *   <script>import "../scripts/hero3d";</script>   // auto-mounts every [data-hero-3d]
 *
 * or manually:
 *   import { mountHero } from "../scripts/hero3d";
 *   const hero = mountHero(el); ... hero.destroy();
 *
 * Optional attributes on the element:
 *   data-hero-src       glb url            (default /models/hero.glb)
 *   data-hero-fallback  png url            (default /models/hero-fallback.png; a .webp twin is preferred)
 *   data-hero-alt       alt text for the fallback image
 *   data-hero-story     scroll-story mode (home page). On screens >= 640px the element gets
 *                       data-story="on" once the scene is ready (CSS makes it a fixed full-viewport
 *                       stage), the built-in scroll rotation is off, and the page drives the object
 *                       through `handle.pose` (see HeroPose). Below 640px it behaves like a normal hero.
 *
 * Behaviour:
 *   - A static poster image is shown immediately (good LCP), then the WebGL scene crossfades in.
 *     `el.dataset.ready = 'true'` is set once the poster or the first frame is up (ui/HeroStage contract).
 *   - prefers-reduced-motion, Save-Data, or no WebGL: the poster stays and nothing else loads.
 *   - three + GLTFLoader are lazy-imported; nothing heavy loads until the element is near the viewport.
 *   - Rendering pauses when off-screen, hidden, or (story mode) faded out; DPR capped at 2.
 */

import type * as THREE_NS from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/** Scroll-story controls. Set the fields; the renderer eases towards them every frame. */
export interface HeroPose {
  /** Horizontal offset of the object centre, as a fraction of viewport width (-0.5…0.5). */
  x: number;
  /** Vertical offset, fraction of viewport height (+ is up). */
  y: number;
  /** Size multiplier (1 ≈ the object fills ~70% of the viewport height). */
  scale: number;
  /** Extra rotation in radians. */
  rotX: number;
  rotY: number;
  /** 0…1: the island lifts off the passport. */
  lift: number;
  /** 0…1: the visa stamp glows and pulses. */
  glow: number;
  /** 0…1: blueprint look (solid fades out, outline drawing fades in). */
  wire: number;
  /** 0…1: the long-tail boat sails around the island. */
  boat: number;
  /** Continuous spin speed in rad/s. */
  spin: number;
  /** 0…1: canvas opacity (0 also skips rendering). */
  opacity: number;
}

export interface HeroHandle {
  destroy(): void;
  /** True when mounted in story mode (fixed stage driven by `pose`). */
  readonly story: boolean;
  /** Mutable targets for story mode. Ignored otherwise. */
  pose: HeroPose;
  /** Resolves true once the 3D scene is showing, false if it fell back to the static image. */
  ready: Promise<boolean>;
}

export const DEFAULT_POSE: Readonly<HeroPose> = {
  x: 0,
  y: 0,
  scale: 1,
  rotX: 0,
  rotY: 0,
  lift: 0,
  glow: 0,
  wire: 0,
  boat: 0,
  spin: 0,
  opacity: 1,
};

const DEFAULT_SRC = "/models/hero.glb";
const DEFAULT_FALLBACK = "/models/hero-fallback.png";
const DEFAULT_ALT =
  "An open passport with a glowing gold visa stamp, and a small floating Thai island with palm trees, a white chedi and a long-tail boat rising from its pages.";

const mounted = new WeakMap<HTMLElement, HeroHandle>();
const live = new Set<HeroHandle>();

function prefersReducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function saveData(): boolean {
  const c = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return !!c?.saveData;
}

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

function createPoster(el: HTMLElement): HTMLPictureElement {
  const fallback = el.dataset.heroFallback || DEFAULT_FALLBACK;
  const picture = document.createElement("picture");
  picture.className = "hero3d-poster";
  if (fallback.endsWith(".png")) {
    const source = document.createElement("source");
    source.type = "image/webp";
    source.srcset = fallback.replace(/\.png$/, ".webp");
    picture.appendChild(source);
  }
  const img = document.createElement("img");
  img.src = fallback;
  img.alt = el.dataset.heroAlt || DEFAULT_ALT;
  img.width = 1600;
  img.height = 1200;
  img.decoding = "async";
  img.setAttribute("fetchpriority", "high");
  Object.assign(img.style, {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    display: "block",
  } satisfies Partial<CSSStyleDeclaration>);
  picture.appendChild(img);
  Object.assign(picture.style, {
    position: "absolute",
    inset: "0",
    display: "block",
    zIndex: "1",
    transition: "opacity 600ms ease",
  } satisfies Partial<CSSStyleDeclaration>);
  return picture;
}

export function mountHero(el: HTMLElement): HeroHandle {
  const existing = mounted.get(el);
  if (existing) return existing;

  if (getComputedStyle(el).position === "static") el.style.position = "relative";
  if (!el.style.minHeight && el.clientHeight === 0) el.style.minHeight = "320px";

  const poster = createPoster(el);
  el.appendChild(poster);
  // The poster replaces any inline fallback (ui/HeroStage fades its SVG on data-ready).
  el.dataset.ready = "true";

  const story =
    el.hasAttribute("data-hero-story") && typeof matchMedia === "function" && matchMedia("(min-width: 640px)").matches;

  let destroyed = false;
  let cleanup: (() => void) | null = null;
  let lazyIO: IntersectionObserver | null = null;
  let resolveReady!: (v: boolean) => void;
  const ready = new Promise<boolean>((r) => (resolveReady = r));

  const handle: HeroHandle = {
    story,
    pose: { ...DEFAULT_POSE },
    ready,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      lazyIO?.disconnect();
      cleanup?.();
      poster.remove();
      delete el.dataset.story;
      mounted.delete(el);
      live.delete(handle);
      resolveReady(false);
    },
  };
  mounted.set(el, handle);
  live.add(handle);

  const fallBack = () => {
    el.dataset.hero3dState = "fallback";
    delete el.dataset.story;
    poster.style.opacity = "1";
    resolveReady(false);
  };

  // Static only: reduced motion, data saver, or no WebGL.
  if (prefersReducedMotion() || saveData() || !hasWebGL()) {
    fallBack();
    return handle;
  }

  // Defer the heavy imports until the hero is (nearly) visible.
  lazyIO = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      lazyIO?.disconnect();
      lazyIO = null;
      start().catch((err) => {
        console.warn("[hero3d] falling back to static image:", err);
        cleanup?.();
        cleanup = null;
        fallBack();
      });
    },
    { rootMargin: "200px" },
  );
  lazyIO.observe(el);

  async function start() {
    el.dataset.hero3dState = "loading";
    const [THREE, { GLTFLoader }, { RoomEnvironment }] = await Promise.all([
      import("three"),
      import("three/addons/loaders/GLTFLoader.js"),
      import("three/addons/environments/RoomEnvironment.js"),
    ]);
    if (destroyed) return;
    gsap.registerPlugin(ScrollTrigger);

    // ---------- renderer / scene ----------
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    const canvas = renderer.domElement;
    canvas.setAttribute("aria-hidden", "true");
    Object.assign(canvas.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      opacity: "0",
      display: "block",
      zIndex: "2",
      touchAction: "pan-y",
    } satisfies Partial<CSSStyleDeclaration>);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    scene.environmentIntensity = 0.55;

    // Soft, warm lighting (mirrors the Blender render).
    scene.add(new THREE.HemisphereLight(0xfff6e8, 0xe8d3a8, 0.9));
    const key = new THREE.DirectionalLight(0xffeedd, 2.2);
    key.position.set(4, 6, 3);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 16;
    const sc = key.shadow.camera as THREE_NS.OrthographicCamera;
    sc.left = -2.5;
    sc.right = 2.5;
    sc.top = 2.5;
    sc.bottom = -2.5;
    key.shadow.bias = -0.0008;
    key.shadow.normalBias = 0.02;
    key.shadow.radius = 6;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xcfe8ff, 0.6);
    fill.position.set(-4, 2.5, 3);
    scene.add(fill);

    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
    const target = new THREE.Vector3(0, 1.2, 0);
    const viewDir = new THREE.Vector3(3.9, 2.95, 6.1).normalize();

    // ---------- model ----------
    const gltf = await new GLTFLoader().loadAsync(el.dataset.heroSrc || DEFAULT_SRC);
    if (destroyed) {
      renderer.dispose();
      envTex.dispose();
      pmrem.dispose();
      return;
    }

    const model = gltf.scene;
    const solidMats = new Set<THREE_NS.MeshStandardMaterial>();
    const meshes: THREE_NS.Mesh[] = [];
    model.traverse((o) => {
      const mesh = o as THREE_NS.Mesh;
      if (!mesh.isMesh) return;
      meshes.push(mesh);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        const std = m as THREE_NS.MeshStandardMaterial;
        if (!std.isMeshStandardMaterial) continue;
        solidMats.add(std);
        if (std.metalness > 0.3) std.envMapIntensity = 1.4;
      }
    });
    const stampMat = [...solidMats].find((m) => m.name === "StampGlow");
    const stampBase = stampMat?.emissiveIntensity ?? 1;

    // Pivot so rotations turn around the visual centre of the scene.
    const pivot = new THREE.Group();
    pivot.position.copy(target);
    model.position.sub(target);
    pivot.add(model);
    scene.add(pivot);

    const island = model.getObjectByName("Island");
    const islandBase = island ? island.position.clone() : null;
    const sparkles: { obj: THREE_NS.Object3D; base: THREE_NS.Vector3; phase: number }[] = [];
    model.getObjectByName("Sparkles")?.children.forEach((obj, i) => {
      sparkles.push({ obj, base: obj.position.clone(), phase: i * 1.37 });
    });
    const boat = model.getObjectByName("Boat");
    const boatBase = boat ? { pos: boat.position.clone(), ry: boat.rotation.y, rx: boat.rotation.x } : null;
    const stamp = model.getObjectByName("Stamp");

    // Blueprint outline drawing, built lazily the first time `wire` rises.
    let lines: THREE_NS.Group | null = null;
    let lineMat: THREE_NS.LineBasicMaterial | null = null;
    function buildLines() {
      const color = getComputedStyle(el).getPropertyValue("--night-line-strong").trim() || "#5cc8be";
      lineMat = new THREE.LineBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0 });
      lines = new THREE.Group();
      for (const mesh of meshes) {
        const seg = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 28), lineMat);
        seg.matrixAutoUpdate = false;
        mesh.add(seg); // follows every animated node
      }
    }

    // Bounding sphere for responsive framing.
    const sphere = new THREE.Box3().setFromObject(model).getBoundingSphere(new THREE.Sphere());
    let baseDist = 10;

    function fit() {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      const vFov = THREE.MathUtils.degToRad(camera.fov);
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
      const fov = Math.min(vFov, hFov);
      // Story stage is the whole viewport: leave room around the object.
      baseDist = (sphere.radius * (story ? 1.45 : 1.02)) / Math.sin(fov / 2);
      camera.position.copy(target).addScaledVector(viewDir, baseDist);
      camera.lookAt(target);
      camera.updateProjectionMatrix();
    }
    const camRight = new THREE.Vector3();
    const camUp = new THREE.Vector3();

    // ---------- interaction state ----------
    const state = { scroll: 0, intro: 0, fade: 0 };
    const cur: HeroPose = { ...handle.pose };
    let spinAngle = 0;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    const scrollTween = story
      ? null
      : gsap.to(state, {
          scroll: 1,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: 0.6 },
        });

    // ---------- render loop (paused off-screen) ----------
    let last = performance.now();
    let elapsed = 0;
    let running = false;
    let shownOpacity = -1;
    let transparentOn = false;

    function frame(now: number) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      elapsed += dt;
      const t = elapsed;

      const k = 1 - Math.exp(-dt * 4);
      pointer.x += (pointer.tx - pointer.x) * k;
      pointer.y += (pointer.ty - pointer.y) * k;

      // Ease the story pose towards its targets (this is the "scrub" smoothing).
      const kp = 1 - Math.exp(-dt * 5);
      const p = handle.pose;
      for (const key of Object.keys(cur) as (keyof HeroPose)[]) cur[key] += (p[key] - cur[key]) * kp;
      spinAngle += cur.spin * dt;

      const opacity = state.fade * cur.opacity;
      if (Math.abs(opacity - shownOpacity) > 0.004) {
        canvas.style.opacity = opacity.toFixed(3);
        shownOpacity = opacity;
      }
      if (opacity < 0.01) return; // invisible: skip the GPU work

      const intro = state.intro;
      pivot.rotation.y =
        Math.sin(t * 0.25) * 0.12 + pointer.x * 0.18 + state.scroll * 0.9 - (1 - intro) * 0.5 + cur.rotY + spinAngle;
      pivot.rotation.x = pointer.y * 0.06 + state.scroll * 0.12 + cur.rotX;
      pivot.scale.setScalar((0.92 + 0.08 * intro) * cur.scale);

      // Screen-space offset: move the pivot along the camera's right/up axes.
      const halfH = baseDist * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
      const halfW = halfH * camera.aspect;
      camRight.setFromMatrixColumn(camera.matrixWorld, 0);
      camUp.setFromMatrixColumn(camera.matrixWorld, 1);
      pivot.position
        .copy(target)
        .addScaledVector(camRight, cur.x * 2 * halfW)
        .addScaledVector(camUp, cur.y * 2 * halfH);
      pivot.position.y += Math.sin(t * 0.6) * 0.03 - state.scroll * 0.25;

      if (island && islandBase) {
        island.position.y =
          islandBase.y + Math.sin(t * 0.9) * 0.07 - (1 - intro) * 0.6 + state.scroll * 0.3 + cur.lift * 0.9;
        island.rotation.y = t * 0.08;
      }
      if (boat && boatBase) {
        const a = cur.boat * Math.PI * 1.2;
        const c = Math.cos(a);
        const s = Math.sin(a);
        boat.position.x = boatBase.pos.x * c + boatBase.pos.z * s;
        boat.position.z = -boatBase.pos.x * s + boatBase.pos.z * c;
        boat.position.y = boatBase.pos.y + Math.sin(t * 2.1) * 0.012;
        boat.rotation.y = boatBase.ry + a;
        boat.rotation.x = boatBase.rx + Math.sin(t * 1.7) * 0.03;
      }
      for (const s of sparkles) {
        s.obj.position.y = s.base.y + Math.sin(t * 1.2 + s.phase) * 0.06;
        s.obj.rotation.y = t * 0.8 + s.phase;
      }
      if (stampMat && stamp) {
        const pulse = cur.glow * (0.5 + 0.5 * Math.sin(t * 4));
        stampMat.emissiveIntensity = stampBase * (1 + cur.glow * 2.5 + pulse * 2);
        stamp.scale.setScalar(1 + pulse * 0.08);
      }

      // Blueprint: fade solids out, outlines in.
      if (cur.wire > 0.01 && !lines) buildLines();
      const wantTransparent = cur.wire > 0.01;
      if (wantTransparent !== transparentOn) {
        transparentOn = wantTransparent;
        for (const m of solidMats) {
          m.transparent = wantTransparent;
          m.depthWrite = !wantTransparent;
          m.needsUpdate = true;
        }
      }
      if (transparentOn) for (const m of solidMats) m.opacity = 1 - cur.wire * 0.94;
      if (lineMat) lineMat.opacity = cur.wire;

      renderer.render(scene, camera);
    }

    function play() {
      if (running || destroyed) return;
      running = true;
      last = performance.now();
      renderer.setAnimationLoop(frame);
    }
    function pause() {
      if (!running) return;
      running = false;
      renderer.setAnimationLoop(null);
    }

    const visIO = new IntersectionObserver((entries) => {
      for (const e of entries) (e.isIntersecting ? play : pause)();
    });
    const onVisibility = () => {
      if (document.hidden) pause();
      else if (isOnScreen()) play();
    };
    function isOnScreen() {
      const r = el.getBoundingClientRect();
      return r.bottom > 0 && r.top < window.innerHeight;
    }
    document.addEventListener("visibilitychange", onVisibility);

    let resizeRaf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        fit();
        if (!running) renderer.render(scene, camera);
      });
    });

    // Losing the GL context (GPU reset, too many contexts) → show the poster.
    const onContextLost = (e: Event) => {
      e.preventDefault();
      pause();
      canvas.style.opacity = "0";
      fallBack();
    };
    canvas.addEventListener("webglcontextlost", onContextLost);

    // Story mode: the element becomes the fixed stage (CSS keys on data-story) before the first frame.
    if (story) el.dataset.story = "on";
    fit();
    el.appendChild(canvas);
    await renderer.compileAsync(scene, camera).catch(() => undefined);
    if (destroyed) {
      disposeAll();
      return;
    }
    frame(performance.now());
    ro.observe(el);
    visIO.observe(el);
    el.dataset.hero3dState = "ready";
    resolveReady(true);

    const introTl = gsap.timeline();
    introTl
      .to(state, { fade: 1, duration: 0.8, ease: "power2.out" }, 0)
      .to(poster, { opacity: 0, duration: 0.6, ease: "power1.out" }, 0.15)
      .to(state, { intro: 1, duration: 1.6, ease: "power3.out" }, 0);

    function disposeAll() {
      pause();
      introTl?.kill();
      scrollTween?.scrollTrigger?.kill();
      scrollTween?.kill();
      visIO.disconnect();
      ro.disconnect();
      cancelAnimationFrame(resizeRaf);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onContextLost);

      scene.traverse((o) => {
        const obj = o as THREE_NS.Mesh;
        if (!(obj.isMesh || (o as THREE_NS.LineSegments).isLineSegments)) return;
        obj.geometry?.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) {
          for (const v of Object.values(m)) {
            if (v && typeof v === "object" && (v as THREE_NS.Texture).isTexture) (v as THREE_NS.Texture).dispose();
          }
          m.dispose();
        }
      });
      envTex.dispose();
      pmrem.dispose();
      key.shadow.map?.dispose();
      renderer.renderLists.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    }

    cleanup = disposeAll;
  }

  return handle;
}

/** Mount every [data-hero-3d] element on the page (idempotent). */
export function mountAllHeroes(root: ParentNode = document): HeroHandle[] {
  return Array.from(root.querySelectorAll<HTMLElement>("[data-hero-3d]")).map(mountHero);
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => mountAllHeroes(), { once: true });
  } else {
    mountAllHeroes();
  }
  // Astro view transitions: mount heroes on newly swapped-in pages.
  document.addEventListener("astro:page-load", () => mountAllHeroes());
  document.addEventListener("astro:before-swap", () => {
    for (const h of Array.from(live)) h.destroy();
  });
}
