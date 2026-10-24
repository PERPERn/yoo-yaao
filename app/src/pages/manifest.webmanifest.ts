// Web app manifest, generated at build time so the name always comes from SITE.
// Colours mirror --color-bg / --color-brand in src/styles/tokens.css (a manifest can't read CSS variables).
import type { APIRoute } from 'astro';
import { SITE } from '../config/site';

export const prerender = true;

const THEME = '#0d6461'; // --color-brand
const BACKGROUND = '#f6f3ec'; // --color-bg

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify(
      {
        name: SITE.name,
        short_name: SITE.name,
        description: SITE.description,
        id: '/',
        start_url: '/?source=pwa',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        lang: 'en',
        theme_color: THEME,
        background_color: BACKGROUND,
        categories: ['travel', 'utilities'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Visa Finder', url: '/finder', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
          { name: '90-day calculator', url: '/tools/90-day', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
          { name: 'My account', url: '/account', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
        ],
      },
      null,
      2,
    ),
    { headers: { 'content-type': 'application/manifest+json; charset=utf-8' } },
  );
