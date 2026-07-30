import type { ModelVariant } from '../types';

// Пин на конкретный коммит SacredNoir/isnet-general-use-onnx (Apache-2.0).
// При изменении не забыть продублировать в scripts/fetch-models.mjs.
const COMMIT = 'ff56cb825ee2637d4726f8a739fb7bf1bf4bea04';

export type ModelManifestEntry = {
  variant: ModelVariant;
  sha256: string;
  sizeBytes: number;
  // зеркала одного и того же файла, в порядке перебора;
  // доверие даёт хэш, а не репутация репозитория
  urls: string[];
};

export const MODEL_MANIFEST: Record<ModelVariant, ModelManifestEntry> = {
  fp32: {
    variant: 'fp32',
    sha256: '4c56bbc21588459dda11efba5a4a8ee163969da109ae170fb1988c1c2ea4a90a',
    sizeBytes: 176_213_804,
    urls: [
      `https://huggingface.co/SacredNoir/isnet-general-use-onnx/resolve/${COMMIT}/isnet-general-use.onnx`,
      'https://huggingface.co/x-Liola-x/isnet-general-use-onnx/resolve/main/isnet-general-use.onnx',
    ],
  },
  q8: {
    variant: 'q8',
    sha256: 'feed6f32a5e707ca7e939576b2d891b23fb9eb4114749657a5efc64e8651e43a',
    sizeBytes: 44_436_071,
    urls: [
      `https://huggingface.co/SacredNoir/isnet-general-use-onnx/resolve/${COMMIT}/isnet-general-use-q8.onnx`,
    ],
  },
};

// каноническому URL (первому зеркалу) соответствует ключ Cache Storage
export function canonicalUrl(variant: ModelVariant): string {
  const url = MODEL_MANIFEST[variant].urls[0];
  if (url === undefined) throw new Error(`Нет URL для варианта ${variant}`);
  return url;
}

export function variantForBackend(backend: 'webgpu' | 'wasm'): ModelVariant {
  return backend === 'webgpu' ? 'fp32' : 'q8';
}
