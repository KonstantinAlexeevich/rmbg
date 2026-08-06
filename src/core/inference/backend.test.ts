import { describe, expect, it } from 'vitest';
import { detectBackend, gpuAdapterName, type Gpu } from './backend';

function gpuWith(
  result: Awaited<ReturnType<Gpu['requestAdapter']>> | 'throw',
): Gpu {
  return {
    async requestAdapter() {
      if (result === 'throw') throw new Error('gpu failed');
      return result;
    },
  };
}

describe('detectBackend', () => {
  it('honors explicit override', async () => {
    expect(await detectBackend('wasm', () => gpuWith({ info: { vendor: 'x', architecture: 'y', description: 'z' } }))).toBe(
      'wasm',
    );
    expect(await detectBackend('webgpu', () => null)).toBe('webgpu');
  });

  it('returns wasm when GPU is unavailable', async () => {
    expect(await detectBackend('auto', () => null)).toBe('wasm');
  });

  it('returns webgpu when adapter exists', async () => {
    expect(
      await detectBackend(
        'auto',
        () =>
          gpuWith({
            info: { vendor: 'a', architecture: 'b', description: 'Adapter' },
          }),
      ),
    ).toBe('webgpu');
  });

  it('returns wasm when adapter is null or request throws', async () => {
    expect(await detectBackend('auto', () => gpuWith(null))).toBe('wasm');
    expect(await detectBackend('auto', () => gpuWith('throw'))).toBe('wasm');
  });
});

describe('gpuAdapterName', () => {
  it('returns empty string without GPU or adapter', async () => {
    expect(await gpuAdapterName(() => null)).toBe('');
    expect(await gpuAdapterName(() => gpuWith(null))).toBe('');
    expect(await gpuAdapterName(() => gpuWith('throw'))).toBe('');
  });

  it('prefers description, else vendor + architecture', async () => {
    expect(
      await gpuAdapterName(() =>
        gpuWith({
          info: { vendor: 'a', architecture: 'b', description: 'Nice GPU' },
        }),
      ),
    ).toBe('Nice GPU');

    expect(
      await gpuAdapterName(() =>
        gpuWith({
          info: { vendor: 'apple', architecture: 'metal', description: '' },
        }),
      ),
    ).toBe('apple metal');
  });
});
