/** Jobs от контекстного меню → студия через session storage. */

import {
  EXT_JOBS_KEY,
  MENU_EXPORTS_KEY,
  type ExtJob,
  type MenuExport,
} from '../shared/ext-protocol';
import { detectLocale, translate } from '../shared/messages';

export type { ExtJob, MenuExport };
export { MENU_EXPORTS_KEY };

export async function enqueueJob(job: ExtJob): Promise<void> {
  const stored = await chrome.storage.session.get(EXT_JOBS_KEY);
  const current = Array.isArray(stored[EXT_JOBS_KEY])
    ? (stored[EXT_JOBS_KEY] as ExtJob[])
    : [];
  current.push(job);
  await chrome.storage.session.set({ [EXT_JOBS_KEY]: current });
}

export async function claimJobs(): Promise<ExtJob[]> {
  const stored = await chrome.storage.session.get(EXT_JOBS_KEY);
  const jobs = Array.isArray(stored[EXT_JOBS_KEY])
    ? (stored[EXT_JOBS_KEY] as ExtJob[])
    : [];
  if (jobs.length === 0) return [];
  await chrome.storage.session.set({ [EXT_JOBS_KEY]: [] });
  return jobs;
}

export async function loadMenuExports(): Promise<MenuExport[]> {
  const stored = await chrome.storage.local.get(MENU_EXPORTS_KEY);
  const list = stored[MENU_EXPORTS_KEY];
  if (!Array.isArray(list) || list.length === 0) {
    const name = translate(detectLocale(chrome.i18n.getUILanguage()), 'outputDefaultName');
    return [{ id: 'default', name }];
  }
  return list.filter(
    (item): item is MenuExport =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as MenuExport).id === 'string' &&
      typeof (item as MenuExport).name === 'string',
  );
}

export async function saveMenuExports(exports: MenuExport[]): Promise<void> {
  await chrome.storage.local.set({ [MENU_EXPORTS_KEY]: exports });
}
