// Catalogs live in locales/studio/*.json. English is the source dictionary;
// Russian is a full translation keyed by the same keys.
// Components never hardcode UI copy — only MessageKey via t().

import {
  detectLocale,
  translate,
  type Locale,
  type MessageKey,
} from '../../shared/messages';

export type { Locale, MessageKey };
export { detectLocale };

let currentLocale: Locale = 'en';

export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function t(
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  return translate(currentLocale, key, params);
}

export function formatBytes(bytes: number): string {
  if (currentLocale === 'ru') {
    if (bytes >= 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} МБ`;
    return `${Math.round(bytes / 1024)} КБ`;
  }
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

export function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (currentLocale === 'ru') {
    if (seconds < 60) return `${seconds} с`;
    return `${Math.floor(seconds / 60)} мин ${seconds % 60} с`;
  }
  if (seconds < 60) return `${seconds} s`;
  return `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
}
