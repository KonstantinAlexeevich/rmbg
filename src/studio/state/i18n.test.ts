import { afterEach, describe, expect, it } from 'vitest';
import { formatBytes, formatDuration, setLocale } from './i18n';

afterEach(() => {
  setLocale('en');
});

describe('formatBytes', () => {
  it('formats KB/MB in en and ru', () => {
    setLocale('en');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(2 * 1024 * 1024)).toBe('2 MB');
    setLocale('ru');
    expect(formatBytes(2048)).toBe('2 КБ');
    expect(formatBytes(2 * 1024 * 1024)).toBe('2 МБ');
  });
});

describe('formatDuration', () => {
  it('formats seconds and minutes', () => {
    setLocale('en');
    expect(formatDuration(4500)).toBe('5 s');
    expect(formatDuration(65_000)).toBe('1 min 5 s');
    setLocale('ru');
    expect(formatDuration(4500)).toBe('5 с');
    expect(formatDuration(65_000)).toBe('1 мин 5 с');
  });
});
