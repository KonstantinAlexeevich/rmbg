import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearMockCaches, installMockCaches } from '../../test/mock-caches';
import { writeCachedModel } from '../storage/model-cache';
import { ensureModel } from './model-loader';

const MIRROR_A = 'https://example.com/mirror-a.onnx';
const BYTES = new TextEncoder().encode('abc');
/** SHA-256 of "abc" */
const SHA_ABC = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

vi.mock('./model-manifest', () => ({
  MODEL_MANIFEST: {
    q8: {
      variant: 'q8',
      sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
      sizeBytes: 3,
      urls: [
        'https://example.com/mirror-a.onnx',
        'https://example.com/mirror-b.onnx',
      ],
    },
    fp32: {
      variant: 'fp32',
      sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
      sizeBytes: 3,
      urls: ['https://example.com/fp32.onnx'],
    },
  },
  canonicalUrl: (variant: 'q8' | 'fp32') =>
    variant === 'q8'
      ? 'https://example.com/mirror-a.onnx'
      : 'https://example.com/fp32.onnx',
}));

function streamResponse(body: Uint8Array, ok = true): Response {
  return new Response(body.slice().buffer, {
    status: ok ? 200 : 500,
    headers: { 'Content-Length': String(body.byteLength) },
  });
}

describe('ensureModel', () => {
  beforeEach(() => {
    installMockCaches();
    vi.stubGlobal('navigator', {
      ...navigator,
      storage: { persist: vi.fn(async () => true) },
    });
  });

  afterEach(() => {
    clearMockCaches();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns fromCache when known asset and cache hit', async () => {
    const asset = {
      variant: 'q8' as const,
      url: MIRROR_A,
      sha256: SHA_ABC,
      sizeBytes: 3,
      downloadedAt: 1,
    };
    await writeCachedModel(MIRROR_A, BYTES);
    const outcome = await ensureModel({
      variant: 'q8',
      knownAssets: [asset],
      signal: new AbortController().signal,
      onProgress: () => {},
    });
    expect(outcome).toEqual({ kind: 'ready', asset, fromCache: true });
  });

  it('downloads, verifies sha, writes cache, reports progress', async () => {
    const progress: Array<{ loadedBytes: number; totalBytes: number }> = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        expect(url).toBe(MIRROR_A);
        return streamResponse(BYTES);
      }),
    );

    const outcome = await ensureModel({
      variant: 'q8',
      knownAssets: [],
      signal: new AbortController().signal,
      onProgress: (p) => progress.push(p),
    });

    expect(outcome.kind).toBe('ready');
    if (outcome.kind === 'ready') {
      expect(outcome.fromCache).toBe(false);
      expect(outcome.asset.sha256).toBe(SHA_ABC);
      expect(outcome.asset.url).toBe(MIRROR_A);
    }
    expect(progress.some((p) => p.loadedBytes === 3)).toBe(true);
  });

  it('fails over to next mirror when first is down', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url === MIRROR_A) throw new Error('network');
        return streamResponse(BYTES);
      }),
    );

    const outcome = await ensureModel({
      variant: 'q8',
      knownAssets: [],
      signal: new AbortController().signal,
      onProgress: () => {},
    });

    expect(outcome.kind).toBe('ready');
    if (outcome.kind === 'ready') {
      expect(outcome.asset.url).toBe(MIRROR_A); // canonical cache key
    }
  });

  it('returns hash-mismatch when all mirrors fail hash', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => streamResponse(new TextEncoder().encode('bad'))),
    );

    const outcome = await ensureModel({
      variant: 'q8',
      knownAssets: [],
      signal: new AbortController().signal,
      onProgress: () => {},
    });

    expect(outcome).toEqual({ kind: 'failed', reason: 'hash-mismatch' });
  });

  it('returns network when all mirrors fail without hash attempt', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => streamResponse(BYTES, false)),
    );

    const outcome = await ensureModel({
      variant: 'q8',
      knownAssets: [],
      signal: new AbortController().signal,
      onProgress: () => {},
    });

    expect(outcome).toEqual({ kind: 'failed', reason: 'network' });
  });

  it('returns aborted when signal already aborted', async () => {
    const ac = new AbortController();
    ac.abort();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => streamResponse(BYTES)),
    );

    const outcome = await ensureModel({
      variant: 'q8',
      knownAssets: [],
      signal: ac.signal,
      onProgress: () => {},
    });

    expect(outcome).toEqual({ kind: 'failed', reason: 'aborted' });
  });

  it('returns aborted when fetch throws AbortError', async () => {
    const ac = new AbortController();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        ac.abort();
        throw new DOMException('Aborted', 'AbortError');
      }),
    );

    const outcome = await ensureModel({
      variant: 'q8',
      knownAssets: [],
      signal: ac.signal,
      onProgress: () => {},
    });

    expect(outcome).toEqual({ kind: 'failed', reason: 'aborted' });
  });
});
