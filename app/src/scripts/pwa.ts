/**
 * PWA bootstrap: registers /sw.js (production only) and shows a small offline banner.
 * Import once from layouts/Base.astro:  <script>import '../scripts/pwa';</script>
 */

function registerServiceWorker(): void {
  if (import.meta.env.DEV) return; // Vite dev assets shouldn't be cached
  if (!('serviceWorker' in navigator)) return;
  const register = () => navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined);
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}

function offlineBanner(): void {
  let banner: HTMLElement | null = null;
  const update = () => {
    if (navigator.onLine) {
      banner?.remove();
      banner = null;
      return;
    }
    if (banner) return;
    banner = document.createElement('div');
    banner.setAttribute('role', 'status');
    banner.textContent = "You're offline. Guides and tools still work; payments and booking need a connection.";
    Object.assign(banner.style, {
      position: 'fixed',
      insetInline: '0',
      top: '0',
      zIndex: 'var(--z-toast)',
      padding: 'var(--space-2) var(--gutter)',
      background: 'var(--color-warning-tint)',
      color: 'var(--color-ink)',
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--weight-semibold)',
      textAlign: 'center',
    });
    document.body.prepend(banner);
  };
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  update();
}

registerServiceWorker();
offlineBanner();

export {};
