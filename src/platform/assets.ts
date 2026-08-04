import { isExtension } from './env';

/** Абсолютный URL статического ассета (`icons/...`, `ort/`, `about.html`). */
export function assetUrl(path: string): string {
  const normalized = path.replace(/^\//, '');
  if (isExtension) {
    return chrome.runtime.getURL(normalized);
  }
  // полный URL нужен ORT: dynamic import('/ort/…') в Vite-dev ломается
  return new URL(`/${normalized}`, self.location.origin).href;
}
