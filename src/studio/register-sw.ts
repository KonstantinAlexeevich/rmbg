/** Registers the studio shell service worker (production web builds only). */
export function registerStudioServiceWorker(): void {
  if (!import.meta.env.PROD) return;
  if (!('serviceWorker' in navigator)) return;

  void (async () => {
    // Старый /sw.js мог контролировать весь origin (включая /about/) — снимаем.
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs.map(async (reg) => {
        const scriptURL =
          reg.active?.scriptURL ??
          reg.waiting?.scriptURL ??
          reg.installing?.scriptURL ??
          '';
        const isRootShell =
          scriptURL.endsWith('/sw.js') && !scriptURL.includes('/studio/');
        if (isRootShell) await reg.unregister();
      }),
    );

    // Scope must be /studio/ — max scope for /studio/sw.js is the directory.
    await navigator.serviceWorker.register('/studio/sw.js', { scope: '/studio/' });
  })().catch((err: unknown) => {
    console.warn('[png-maker] service worker registration failed', err);
  });
}
