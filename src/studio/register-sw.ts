/** Registers the studio shell service worker (production web builds only). */
export function registerStudioServiceWorker(): void {
  if (!import.meta.env.PROD) return;
  if (!('serviceWorker' in navigator)) return;

  void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((err: unknown) => {
    console.warn('[png-maker] service worker registration failed', err);
  });
}
