/* Service worker: cache-first for static assets, network-first for pages with an offline fallback.
   Never touches /api/* (payments, forms and revenue must always be live) or /account (signed-in page).
   Bump VERSION to drop old caches. */
const VERSION = 'v2';
const STATIC = `static-${VERSION}`;
const PAGES = `pages-${VERSION}`;
const OFFLINE_URL = '/offline';
const PRECACHE = [OFFLINE_URL, '/', '/finder', '/visas', '/tools', '/tools/90-day', '/manifest.webmanifest', '/icons/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PAGES);
      // One failing URL must not break the install.
      await Promise.all(PRECACHE.map((u) => cache.add(new Request(u, { cache: 'reload' })).catch(() => undefined)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([STATIC, PAGES]);
      for (const key of await caches.keys()) if (!keep.has(key)) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

const isStatic = (url) =>
  url.pathname.startsWith('/_astro/') ||
  url.pathname.startsWith('/icons/') ||
  url.pathname.startsWith('/models/') ||
  /\.(?:css|js|mjs|woff2?|ttf|png|jpe?g|webp|avif|svg|ico|glb)$/i.test(url.pathname);

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/account')) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          if (res.ok) {
            const copy = res.clone();
            caches.open(PAGES).then((c) => c.put(url.pathname, copy)).catch(() => undefined);
          }
          return res;
        } catch {
          const cache = await caches.open(PAGES);
          return (await cache.match(url.pathname)) || (await cache.match(OFFLINE_URL)) || Response.error();
        }
      })(),
    );
    return;
  }

  if (isStatic(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC);
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok && res.type === 'basic') cache.put(req, res.clone()).catch(() => undefined);
        return res;
      })(),
    );
  }
});
