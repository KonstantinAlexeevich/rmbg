/** Доступ к хосту картинки и чтение байтов без обязательных host_permissions на весь интернет. */

import { bytesToBase64 } from '../platform/base64';

export type ExtractedImage = {
  base64: string;
  mime: string;
  name: string;
};

function fileNameFromUrl(srcUrl: string): string {
  try {
    const path = new URL(srcUrl).pathname;
    const base = path.split('/').filter(Boolean).pop() ?? 'image';
    const decoded = decodeURIComponent(base);
    if (/\.(png|jpe?g|webp)$/i.test(decoded)) return decoded;
    return `${decoded.replace(/\.[^.]+$/, '') || 'image'}.png`;
  } catch {
    return 'image.png';
  }
}

function guessMime(contentType: string, name: string): string {
  const raw = contentType.split(';')[0]?.trim().toLowerCase() ?? '';
  if (raw === 'image/png' || raw === 'image/jpeg' || raw === 'image/webp') return raw;
  const lower = name.toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/png';
}

function sniffMime(bytes: Uint8Array, fallback: string): string {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'image/png';
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }
  return fallback === 'image/png' || fallback === 'image/jpeg' || fallback === 'image/webp'
    ? fallback
    : 'image/png';
}

function fromBytes(
  bytes: Uint8Array,
  headerMime: string,
  name: string,
): ExtractedImage {
  const mime = sniffMime(bytes, headerMime);
  const ext = mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : 'png';
  const safeName = /\.(png|jpe?g|webp)$/i.test(name)
    ? name
    : `${name.replace(/\.[^.]+$/, '') || 'image'}.${ext}`;
  return { base64: bytesToBase64(bytes), mime, name: safeName };
}

function decodeDataUrl(srcUrl: string): ExtractedImage {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(srcUrl);
  if (match === null) throw new Error('Invalid data URL');
  const headerMime = guessMime(match[1] ?? 'image/png', 'image.png');
  const payload = match[3] ?? '';
  const binary =
    match[2] === ';base64' ? atob(payload) : decodeURIComponent(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return fromBytes(bytes, headerMime, 'image.png');
}

/**
 * Важно: вызывать синхронно из обработчика ПКМ, до любого await.
 * Иначе Chrome глотает permissions.request без диалога (потерян user gesture).
 *
 * Для любого http(s) src просим optional access именно к origin картинки
 * (не ко всем сайтам сразу). Повторно Chrome диалог не показывает.
 */
export function beginImageHostAccess(
  srcUrl: string,
  _pageUrl: string,
): Promise<boolean> {
  if (srcUrl === '' || srcUrl.startsWith('data:') || srcUrl.startsWith('blob:')) {
    return Promise.resolve(true);
  }
  try {
    const pattern = `${new URL(srcUrl).origin}/*`;
    return chrome.permissions.request({ origins: [pattern] }).catch(() => false);
  } catch {
    return Promise.resolve(false);
  }
}

async function fetchImageInServiceWorker(srcUrl: string): Promise<ExtractedImage> {
  const response = await fetch(srcUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image (${response.status})`);
  }
  const buffer = await response.arrayBuffer();
  const name = fileNameFromUrl(srcUrl);
  const headerMime = guessMime(response.headers.get('content-type') ?? '', name);
  return fromBytes(new Uint8Array(buffer), headerMime, name);
}

/** blob: живёт только в вкладке — читаем через one-shot scripting. */
async function extractBlobFromTab(
  tabId: number,
  srcUrl: string,
): Promise<ExtractedImage> {
  type InjectResult =
    | { ok: true; base64: string; mime: string; name: string }
    | { ok: false; error: string };

  const injected = await chrome.scripting.executeScript({
    target: { tabId },
    func: async (url: string): Promise<InjectResult> => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          return { ok: false, error: `Blob fetch failed (${response.status})` };
        }
        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
          binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
        }
        const mime =
          response.headers.get('content-type')?.split(';')[0]?.trim() ||
          'image/png';
        return { ok: true, base64: btoa(binary), mime, name: 'image.png' };
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        };
      }
    },
    args: [srcUrl],
  });

  const result = injected[0]?.result;
  if (result === undefined || !result.ok) {
    throw new Error(
      result && !result.ok ? result.error : 'Failed to read blob: image',
    );
  }
  return { base64: result.base64, mime: result.mime, name: result.name };
}

export async function extractImageForContextMenu(
  srcUrl: string,
  tabId: number | undefined,
  hostAccess: Promise<boolean>,
): Promise<ExtractedImage> {
  if (srcUrl.startsWith('data:')) {
    return decodeDataUrl(srcUrl);
  }

  if (srcUrl.startsWith('blob:')) {
    if (tabId === undefined) throw new Error('No tab for blob: image');
    return extractBlobFromTab(tabId, srcUrl);
  }

  const granted = await hostAccess;
  if (!granted) {
    throw new Error(
      'Need permission to read this image host. Allow access when Chrome asks, then try again.',
    );
  }

  return fetchImageInServiceWorker(srcUrl);
}
