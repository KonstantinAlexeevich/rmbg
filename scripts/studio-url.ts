/** Общий нормализатор URL студии для Vite-конфигов. */

export const DEFAULT_STUDIO_WEB_URL = 'http://localhost:5173/';

export function normalizeStudioWebUrl(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed === '') {
    throw new Error('Studio web URL is empty');
  }
  const withSlash = trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
  let url: URL;
  try {
    url = new URL(withSlash);
  } catch {
    throw new Error(`Invalid studio web URL: ${raw}`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Studio web URL must be http(s): ${raw}`);
  }
  return withSlash;
}

export function studioOriginPattern(studioWebUrl: string): string {
  return `${new URL(studioWebUrl).origin}/*`;
}
