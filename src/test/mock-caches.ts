/** In-memory Cache Storage for unit tests (happy-dom may lack full caches API). */

type CacheMap = Map<string, Response>;

const stores = new Map<string, CacheMap>();

function getStore(name: string): CacheMap {
  let store = stores.get(name);
  if (store === undefined) {
    store = new Map();
    stores.set(name, store);
  }
  return store;
}

export function installMockCaches(): void {
  stores.clear();
  const cachesApi: CacheStorage = {
    async open(name: string) {
      const store = getStore(name);
      const cacheKey = (request: RequestInfo | URL): string => {
        if (typeof request === 'string') return request;
        if (request instanceof URL) return request.href;
        return request.url;
      };
      const cache: Cache = {
        async match(request) {
          const key = cacheKey(request);
          const response = store.get(key);
          return response === undefined ? undefined : response.clone();
        },
        async put(request, response) {
          store.set(cacheKey(request), response);
        },
        async delete(request) {
          return store.delete(cacheKey(request));
        },
        async keys() {
          return [...store.keys()].map((url) => new Request(url));
        },
        async matchAll() {
          return [...store.values()].map((r) => r.clone());
        },
        async add() {
          throw new Error('not implemented');
        },
        async addAll() {
          throw new Error('not implemented');
        },
      };
      return cache;
    },
    async has(name: string) {
      return stores.has(name);
    },
    async delete(name: string) {
      return stores.delete(name);
    },
    async keys() {
      return [...stores.keys()];
    },
    async match() {
      return undefined;
    },
  };
  Object.defineProperty(globalThis, 'caches', {
    value: cachesApi,
    configurable: true,
    writable: true,
  });
}

export function clearMockCaches(): void {
  stores.clear();
}
