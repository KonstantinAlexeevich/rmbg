import { isExtension } from './env';

const WEB_PREFIX = 'rmbg:';

export async function storageGet(key: string): Promise<unknown> {
  if (isExtension) {
    const stored = await chrome.storage.local.get(key);
    return stored[key];
  }
  const raw = localStorage.getItem(WEB_PREFIX + key);
  if (raw === null) return undefined;
  return JSON.parse(raw) as unknown;
}

export async function storageSet(key: string, value: unknown): Promise<void> {
  if (isExtension) {
    await chrome.storage.local.set({ [key]: value });
    return;
  }
  localStorage.setItem(WEB_PREFIX + key, JSON.stringify(value));
}
