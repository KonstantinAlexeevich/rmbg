// Catalogs live in locales/studio/*.json. English is the source dictionary;
// Russian is a full translation keyed by the same keys.
// Components never hardcode UI copy — only MessageKey via t().

import en from '../../../locales/studio/en.json';
import ruMessages from '../../../locales/studio/ru.json';

export type MessageKey = keyof typeof en;

const ru: Record<MessageKey, string> = ruMessages;

const dictionaries = { en, ru };

export type Locale = keyof typeof dictionaries;

let currentLocale: Locale = 'en';

export function detectLocale(): Locale {
  const lang = typeof navigator !== 'undefined' ? navigator.language : 'en';
  return lang.toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

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
  let text: string = dictionaries[currentLocale][key];
  if (params !== undefined) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
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
