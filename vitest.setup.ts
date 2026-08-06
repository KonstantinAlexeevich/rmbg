import { CanvasAdapter } from '@happy-dom/node-canvas-adapter';

/** In-memory localStorage: Node's experimental Storage can shadow happy-dom. */

class MemoryStorage implements Storage {
  private readonly map = new Map<string, string>();

  get length(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }

  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }

  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  setItem(key: string, value: string): void {
    this.map.set(String(key), String(value));
  }
}

const memory = new MemoryStorage();
Object.defineProperty(globalThis, 'localStorage', {
  value: memory,
  configurable: true,
  writable: true,
});
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: memory,
    configurable: true,
    writable: true,
  });
}

// environmentOptions can't carry class instances (structured clone) — set here.
const happy = (
  window as Window & { happyDOM?: { settings?: { canvasAdapter?: CanvasAdapter } } }
).happyDOM;
if (happy?.settings !== undefined) {
  happy.settings.canvasAdapter = new CanvasAdapter();
}
