import { describe, expect, it } from 'vitest';
import {
  clearAutoDownloadPreset,
  clearEphemeral,
  isEphemeral,
  isQuotaError,
  itemHash,
  markEphemeral,
  peekAutoDownloadPreset,
  setAutoDownloadPreset,
} from './context';
import { defaultSettings } from '../../../core/storage/settings';
import { createOverride } from '../../../core/preset/override';

describe('isQuotaError', () => {
  it('detects QuotaExceededError DOMException', () => {
    expect(isQuotaError(new DOMException('quota', 'QuotaExceededError'))).toBe(
      true,
    );
    expect(isQuotaError(new Error('quota'))).toBe(false);
    expect(isQuotaError(new DOMException('x', 'NotFoundError'))).toBe(false);
  });
});

describe('ephemeral / auto-download maps', () => {
  it('tracks and clears flags', () => {
    markEphemeral('e1');
    expect(isEphemeral('e1')).toBe(true);
    clearEphemeral('e1');
    expect(isEphemeral('e1')).toBe(false);

    setAutoDownloadPreset('i1', 'p1');
    expect(peekAutoDownloadPreset('i1')).toBe('p1');
    clearAutoDownloadPreset('i1');
    expect(peekAutoDownloadPreset('i1')).toBeUndefined();
  });
});

describe('itemHash', () => {
  it('changes when override edge differs from global', () => {
    const settings = defaultSettings();
    const base = itemHash(settings, []);
    const override = createOverride(settings.presets[0]!, {
      ...settings.edge,
      feather: 9,
    });
    expect(itemHash(settings, [override])).not.toBe(base);
  });
});
