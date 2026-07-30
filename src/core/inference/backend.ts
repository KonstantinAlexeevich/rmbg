import type { Backend } from '../types';

// Минимальное описание WebGPU API: используется только детект адаптера,
// сам инференс через WebGPU делает onnxruntime-web.
type GpuAdapterInfo = { vendor: string; architecture: string; description: string };
type GpuAdapter = { info: GpuAdapterInfo };
type Gpu = { requestAdapter(): Promise<GpuAdapter | null> };

function navigatorGpu(): Gpu | null {
  const gpu = (navigator as Navigator & { gpu?: Gpu }).gpu;
  return gpu ?? null;
}

export async function detectBackend(
  override: 'auto' | Backend = 'auto',
): Promise<Backend> {
  if (override !== 'auto') return override;
  const gpu = navigatorGpu();
  if (gpu === null) return 'wasm';
  try {
    const adapter = await gpu.requestAdapter();
    return adapter !== null ? 'webgpu' : 'wasm';
  } catch {
    return 'wasm';
  }
}

export async function gpuAdapterName(): Promise<string> {
  const gpu = navigatorGpu();
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
