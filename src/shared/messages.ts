// Studio catalogs are the single source for user-facing copy, including
// strings needed outside React (settings defaults, extension menu fallback).

import en from '../../locales/studio/en.json';
import ruMessages from '../../locales/studio/ru.json';

export type MessageKey = keyof typeof en;
export type Locale = 'en' | 'ru';

const dictionaries: Record<Locale, Record<MessageKey, string>> = {
  en,
  ru: ruMessages,
};

export function detectLocale(
  language = typeof navigator !== 'undefined' ? navigator.language : 'en',
): Locale {
  return language.toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

export function translate(
  locale: Locale,
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  let text: string = dictionaries[locale][key];
  if (params !== undefined) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}
