/** Общий нормализатор URL студии для Vite-конфигов. */

export const DEFAULT_STUDIO_WEB_URL = 'http://localhost:5173/studio';

/** Канон: без trailing slash у пути (кроме корня `/`). */
export function normalizeStudioWebUrl(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed === '') {
    throw new Error('Studio web URL is empty');
  }
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error(`Invalid studio web URL: ${raw}`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Studio web URL must be http(s): ${raw}`);
  }
  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.replace(/\/+$/, '') || '/';
  }
  return url.href;
}

export function studioOriginPattern(studioWebUrl: string): string {
  return `${new URL(studioWebUrl).origin}/*`;
}
