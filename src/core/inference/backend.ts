import type { Backend } from '../types';

// Минимальное описание WebGPU API: используется только детект адаптера,
// сам инференс через WebGPU делает onnxruntime-web.
export type GpuAdapterInfo = {
  vendor: string;
  architecture: string;
  description: string;
};
export type GpuAdapter = { info: GpuAdapterInfo };
export type Gpu = { requestAdapter(): Promise<GpuAdapter | null> };

function navigatorGpu(): Gpu | null {
  if (typeof navigator === 'undefined') return null;
  const gpu = (navigator as Navigator & { gpu?: Gpu }).gpu;
  return gpu ?? null;
}

export async function detectBackend(
  override: 'auto' | Backend = 'auto',
  getGpu: () => Gpu | null = navigatorGpu,
): Promise<Backend> {
  if (override !== 'auto') return override;
  const gpu = getGpu();
  if (gpu === null) return 'wasm';
  try {
    const adapter = await gpu.requestAdapter();
    return adapter !== null ? 'webgpu' : 'wasm';
  } catch {
    return 'wasm';
  }
}

export async function gpuAdapterName(
  getGpu: () => Gpu | null = navigatorGpu,
): Promise<string> {
  const gpu = getGpu();
  if (gpu === null) return '';
  try {
    const adapter = await gpu.requestAdapter();
    if (adapter === null) return '';
    return adapter.info.description !== ''
      ? adapter.info.description
      : `${adapter.info.vendor} ${adapter.info.architecture}`.trim();
  } catch {
    return '';
  }
}
