import { describe, expect, it } from 'vitest';
import { detectLocale, translate } from './messages';

describe('detectLocale', () => {
  it('maps Russian language tags to ru, else en', () => {
    expect(detectLocale('ru')).toBe('ru');
    expect(detectLocale('ru-RU')).toBe('ru');
    expect(detectLocale('en-US')).toBe('en');
    expect(detectLocale('de')).toBe('en');
  });
});

describe('translate', () => {
  it('interpolates params', () => {
    expect(translate('en', 'progressProcessed', { done: 2, total: 5 })).toContain(
      '2',
    );
    expect(translate('en', 'progressProcessed', { done: 2, total: 5 })).toContain(
      '5',
    );
  });

  it('returns different copy for en vs ru', () => {
    expect(translate('en', 'outputDefaultName')).not.toBe(
      translate('ru', 'outputDefaultName'),
    );
  });
});
