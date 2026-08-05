/* PNG Maker studio shell SW. Served from /studio/sw.js; controls /studio. */
/* CACHE_ID is stamped at web build. */
/* eslint-disable no-restricted-globals */

const CACHE_ID = '__SW_CACHE_ID__';
const SHELL_CACHE = `png-maker-shell-${CACHE_ID}`;

const PRECACHE_URLS = [
  '/studio',
  '/studio/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

const ISOLATION_HEADERS = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

function withIsolation(response) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(ISOLATION_HEADERS)) {
    headers.set(key, value);
  }
  if (!headers.has('Cross-Origin-Resource-Policy')) {
    headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function isNavigation(request) {
  return request.mode === 'navigate' ||
    (request.method === 'GET' &&
      (request.headers.get('accept') ?? '').includes('text/html'));
}

function isStudioPath(pathname) {
  return pathname === '/studio' || pathname.startsWith('/studio/');
}

function shouldHandle(request, url) {
  if (request.method !== 'GET') return false;
  if (url.origin !== self.location.origin) return false;
  // Model weights use app Cache Storage (SHA check); do not shadow in SW.
  if (url.pathname.endsWith('.onnx')) return false;
  // Never intercept landing/about HTML — they are ordinary browser pages.
  if (isNavigation(request) && !isStudioPath(url.pathname)) return false;
  return true;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await cache.addAll(PRECACHE_URLS);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('png-maker-shell-') && key !== SHELL_CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (!shouldHandle(request, url)) return;

  if (isNavigation(request)) {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  event.respondWith(cacheFirstSameOrigin(request));
});

async function networkFirstNavigation(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const fresh = withIsolation(await fetch(request));
    void cache.put(request, fresh.clone());
    void cache.put('/studio', fresh.clone());
    void cache.put('/studio/index.html', fresh.clone());
    return fresh;
  } catch {
    const cached =
      (await cache.match(request)) ??
      (await cache.match('/studio')) ??
      (await cache.match('/studio/index.html'));
    if (cached) return withIsolation(cached);
    throw new Error('offline and no cached shell');
  }
}

async function cacheFirstSameOrigin(request) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const fresh = await fetch(request);
  if (fresh.ok) {
    const toStore =
      request.url.includes('/ort/') || request.url.includes('/assets/')
        ? withIsolation(fresh.clone())
        : fresh.clone();
    void cache.put(request, toStore);
  }
  return fresh;
}
