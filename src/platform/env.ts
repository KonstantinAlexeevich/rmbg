export type AppTarget = 'extension' | 'web';

const raw = import.meta.env.VITE_APP_TARGET;
export const appTarget: AppTarget = raw === 'web' ? 'web' : 'extension';

export const isWeb = appTarget === 'web';
export const isExtension = appTarget === 'extension';

export function appVersion(): string {
  if (isExtension && typeof chrome !== 'undefined' && chrome.runtime?.getManifest) {
    return chrome.runtime.getManifest().version;
  }
  return import.meta.env.VITE_APP_VERSION;
}
