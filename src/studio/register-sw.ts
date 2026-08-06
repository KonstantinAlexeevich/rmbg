/**
 * Старый shell SW на `/sw.js` (не `/studio/sw.js`) контролировал весь origin.
 * Такие регистрации нужно снять перед регистрацией scoped SW.
 */
export function isLegacyRootShellScript(scriptURL: string): boolean {
  return scriptURL.endsWith('/sw.js') && !scriptURL.includes('/studio/');
}

/** Registers the studio shell service worker (production web builds only). */
export function registerStudioServiceWorker(): void {
  if (!import.meta.env.PROD) return;
  if (!('serviceWorker' in navigator)) return;

  void (async () => {
    // Старый /sw.js мог контролировать весь origin (включая /about) — снимаем.
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs.map(async (reg) => {
        const scriptURL =
          reg.active?.scriptURL ??
          reg.waiting?.scriptURL ??
          reg.installing?.scriptURL ??
          '';
        if (isLegacyRootShellScript(scriptURL)) await reg.unregister();
      }),
    );

    // Scope must be /studio/ — max scope for /studio/sw.js is the directory.
    await navigator.serviceWorker.register('/studio/sw.js', { scope: '/studio/' });
  })().catch((err: unknown) => {
    console.warn('[png-maker] service worker registration failed', err);
  });
}
