const CACHE_NAME = 'rmbg-models';

// Ключ кэша — канонический URL варианта (пин на коммит).
export async function readCachedModel(url: string): Promise<Uint8Array | null> {
  const cache = await caches.open(CACHE_NAME);
  const response = await cache.match(url);
  if (response === undefined) return null;
  return new Uint8Array(await response.arrayBuffer());
}

export async function writeCachedModel(url: string, bytes: Uint8Array): Promise<void> {
  const cache = await caches.open(CACHE_NAME);
  await cache.put(url, new Response(bytes.slice().buffer));
}

export async function hasCachedModel(url: string): Promise<boolean> {
  const cache = await caches.open(CACHE_NAME);
  return (await cache.match(url)) !== undefined;
}
