/** Локальный URL web-студии. Позже заменится на прод-домен. */
export const STUDIO_WEB_URL = 'http://localhost:5173/';

/** Маркер на <html> студии: CS и скрытие ПКМ опираются на него + origin. */
export const STUDIO_MARKER_ATTR = 'data-png-maker-studio';
export const STUDIO_MARKER_VALUE = '1';

export function studioPageUrl(): string {
  return STUDIO_WEB_URL;
}

export function aboutPageUrl(): string {
  return new URL('about.html', STUDIO_WEB_URL).href;
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
