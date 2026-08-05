/** URL web-студии: задаётся на билде через VITE_STUDIO_WEB_URL (см. vite.config.ts). */

import { isExtension } from './env';

const DEFAULT_STUDIO_WEB_URL = 'http://localhost:5173/studio';

/** Канон: без trailing slash у пути (кроме корня `/`). */
function normalizeStudioWebUrl(raw: string): string {
  const trimmed = raw.trim();
  const url = new URL(trimmed);
  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.replace(/\/+$/, '') || '/';
  }
  return url.href;
}

export const STUDIO_WEB_URL = normalizeStudioWebUrl(
  import.meta.env.VITE_STUDIO_WEB_URL || DEFAULT_STUDIO_WEB_URL,
);

/** Маркер на <html> студии: CS и скрытие ПКМ опираются на него + origin. */
export const STUDIO_MARKER_ATTR = 'data-png-maker-studio';
export const STUDIO_MARKER_VALUE = '1';

export function studioPageUrl(): string {
  return STUDIO_WEB_URL;
}

/** Web: /about/ на текущем origin; extension: локальный about.html в пакете. */
export function aboutPageUrl(): string {
  if (isExtension) {
    return chrome.runtime.getURL('about.html');
  }
  return aboutWebPath();
}

/** Путь студии на web-origin (для ссылок внутри web-сборки). */
export function studioWebPath(): string {
  return '/studio';
}

/** Путь about на web-origin. */
export function aboutWebPath(): string {
  return '/about/';
}

export function configuredStudioOrigin(): string {
  return new URL(STUDIO_WEB_URL).origin;
}

export function originsMatch(pageUrl: string, studioOrigin: string): boolean {
  try {
    return new URL(pageUrl).origin === studioOrigin;
  } catch {
    return false;
  }
}

// ПКМ на любых http(s) страницах; скрытие на студии — через visible + origin (см. context-menu).
export function contextMenuDocumentUrlPatterns(): string[] {
  return ['http://*/*', 'https://*/*'];
}
