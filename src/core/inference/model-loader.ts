import type { ModelAsset, ModelVariant } from '../types';
import { hasCachedModel, writeCachedModel } from '../storage/model-cache';
import { MODEL_MANIFEST, canonicalUrl } from './model-manifest';

export type DownloadProgress = {
  loadedBytes: number;
  totalBytes: number;
};

export type LoadOutcome =
  // байты в Cache Storage, метаданные подтверждают проверенный хэш
  | { kind: 'ready'; asset: ModelAsset; fromCache: boolean }
  | { kind: 'failed'; reason: 'network' | 'hash-mismatch' | 'aborted' };

type LoadOptions = {
  variant: ModelVariant;
  knownAssets: ModelAsset[];
  signal: AbortSignal;
  onProgress: (progress: DownloadProgress) => void;
};

// Загрузчик весов: кэш → перебор зеркал → SHA-256 → Cache Storage.
// Вызывается со страницы студии; воркер потом читает байты из кэша сам.
export async function ensureModel(options: LoadOptions): Promise<LoadOutcome> {
  const { variant, knownAssets, signal, onProgress } = options;
  const manifest = MODEL_MANIFEST[variant];
  const cacheKey = canonicalUrl(variant);

  // персистентность запрашиваем до скачивания, иначе Chrome под давлением
  // диска вычистит кэш и пользователь снова качает 176 МБ
  await navigator.storage.persist();

  // попадание = байты в кэше И метаданные с проверенным хэшем; иначе промах
  const knownAsset = knownAssets.find((a) => a.url === cacheKey);
  if (knownAsset !== undefined && (await hasCachedModel(cacheKey))) {
    return { kind: 'ready', asset: knownAsset, fromCache: true };
  }

  let sawHashMismatch = false;

  for (const url of manifest.urls) {
    if (signal.aborted) return { kind: 'failed', reason: 'aborted' };

    let bytes: Uint8Array;
    try {
      // обязательно mode: 'cors' — под COEP: require-corp запрос no-cors упадёт
      const response = await fetch(url, { mode: 'cors', signal });
      if (!response.ok || response.body === null) continue;

      const totalBytes = Number(response.headers.get('Content-Length')) || manifest.sizeBytes;
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let loadedBytes = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loadedBytes += value.byteLength;
        onProgress({ loadedBytes, totalBytes });
      }
      bytes = concat(chunks, loadedBytes);
    } catch (e) {
      if (signal.aborted) return { kind: 'failed', reason: 'aborted' };
      console.warn(`Зеркало недоступно: ${url}`, e);
      continue;
    }

    // потокового API у digest нет — буфер держим целиком
    const digest = await crypto.subtle.digest('SHA-256', bytes.slice().buffer);
    const hex = [...new Uint8Array(digest)]
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    if (hex !== manifest.sha256) {
      sawHashMismatch = true;
      console.warn(`SHA-256 не совпал для ${url}: ${hex}`);
      continue;
    }

    await writeCachedModel(cacheKey, bytes);
    const asset: ModelAsset = {
      variant,
      url: cacheKey,
      sha256: manifest.sha256,
      sizeBytes: bytes.byteLength,
      downloadedAt: Date.now(),
    };
    return { kind: 'ready', asset, fromCache: false };
  }

  return { kind: 'failed', reason: sawHashMismatch ? 'hash-mismatch' : 'network' };
}

function concat(chunks: Uint8Array[], totalLength: number): Uint8Array {
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}
