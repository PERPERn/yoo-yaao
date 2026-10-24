// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import { readFile, writeFile } from 'node:fs/promises';

// Security headers for every response (static pages + API functions).
// 'unsafe-inline' scripts/styles: Astro inlines small module scripts and styles.
// blob:/data: + wasm-unsafe-eval: three.js GLTFLoader decodes embedded textures from blob URLs.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://eydalrefulzulohhthcp.supabase.co",
  "font-src 'self' data:",
  "connect-src 'self' blob: data: https://*.supabase.co wss://*.supabase.co",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.stripe.com",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

const SECURITY_HEADERS = {
  'Content-Security-Policy': CSP,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
};

// The Vercel adapter owns .vercel/output/config.json (vercel.json headers are not guaranteed to
// merge with Build Output API routes), so prepend one header route after the adapter writes it.
// Integrations run after the adapter, which Astro always puts first.
const securityHeaders = () => ({
  name: 'security-headers',
  hooks: {
    'astro:build:done': async () => {
      const file = new URL('./.vercel/output/config.json', import.meta.url);
      const config = JSON.parse(await readFile(file, 'utf-8'));
      config.routes.unshift({ src: '^/.*$', headers: SECURITY_HEADERS, continue: true });
      await writeFile(file, JSON.stringify(config, null, '\t'));
    },
  },
});

// Pages are prerendered by default; API routes opt out with `export const prerender = false`.
export default defineConfig({
  site: 'https://longstay-th.vercel.app',
  output: 'static',
  adapter: vercel(),
  integrations: [securityHeaders()],
  // Toolbar overlays content during the live demo.
  devToolbar: { enabled: false },
});
