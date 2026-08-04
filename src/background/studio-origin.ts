import { configuredStudioOrigin } from '../platform/studio-url';
import { STUDIO_ORIGIN_KEY } from '../shared/ext-protocol';

/** Origin студии: из маркера страницы (storage) или из STUDIO_WEB_URL в сборке. */
export async function resolveStudioOrigin(): Promise<string> {
  const stored = await chrome.storage.local.get(STUDIO_ORIGIN_KEY);
  const value = stored[STUDIO_ORIGIN_KEY];
  if (typeof value === 'string' && value !== '') return value;
  return configuredStudioOrigin();
}

export async function saveStudioOrigin(origin: string): Promise<void> {
  await chrome.storage.local.set({ [STUDIO_ORIGIN_KEY]: origin });
}
