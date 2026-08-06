import { describe, expect, it, vi } from 'vitest';
import { BRIDGE_SOURCE, type ExtJob } from '../shared/ext-protocol';
import {
  flushJobsToPage,
  isBridgeFromPage,
  isStudioShell,
} from './bridge-logic';

const job = (id: string): ExtJob => ({
  id,
  kind: 'add',
  base64: 'YQ==',
  mime: 'image/png',
  name: `${id}.png`,
});

describe('isStudioShell', () => {
  it('requires marker attribute on <html>', () => {
    document.documentElement.removeAttribute('data-png-maker-studio');
    expect(isStudioShell(document)).toBe(false);
    document.documentElement.setAttribute('data-png-maker-studio', '1');
    expect(isStudioShell(document)).toBe(true);
  });
});

describe('isBridgeFromPage', () => {
  it('accepts only bridge-sourced objects', () => {
    expect(isBridgeFromPage(null)).toBe(false);
    expect(isBridgeFromPage({ source: 'other' })).toBe(false);
    expect(
      isBridgeFromPage({ source: BRIDGE_SOURCE, type: 'PAGE_READY' }),
    ).toBe(true);
  });
});

describe('flushJobsToPage', () => {
  it('buffers until ready, then drains FIFO', () => {
    const queue = [job('1'), job('2')];
    const post = vi.fn();
    flushJobsToPage(queue, false, post);
    expect(post).not.toHaveBeenCalled();
    expect(queue).toHaveLength(2);

    flushJobsToPage(queue, true, post);
    expect(post.mock.calls.map((c) => c[0].id)).toEqual(['1', '2']);
    expect(queue).toHaveLength(0);
  });
});
