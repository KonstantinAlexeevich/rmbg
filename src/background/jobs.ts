/** Jobs от контекстного меню → студия через session storage + content script. */

export type MenuExport = { id: string; name: string };

export type ExtJob =
  | {
      id: string;
      kind: 'add';
      base64: string;
      mime: string;
      name: string;
    }
  | {
      id: string;
      kind: 'save';
      presetId: string;
      base64: string;
      mime: string;
      name: string;
    }
  | {
      id: string;
      kind: 'error';
      message: string;
    };

const JOBS_KEY = 'extJobs';
export const MENU_EXPORTS_KEY = 'menuExports';

export async function enqueueJob(job: ExtJob): Promise<void> {
  const stored = await chrome.storage.session.get(JOBS_KEY);
  const current = Array.isArray(stored[JOBS_KEY])
    ? (stored[JOBS_KEY] as ExtJob[])
    : [];
  current.push(job);
  await chrome.storage.session.set({ [JOBS_KEY]: current });
}

export async function claimJobs(): Promise<ExtJob[]> {
  const stored = await chrome.storage.session.get(JOBS_KEY);
  const jobs = Array.isArray(stored[JOBS_KEY])
    ? (stored[JOBS_KEY] as ExtJob[])
    : [];
  if (jobs.length === 0) return [];
  await chrome.storage.session.set({ [JOBS_KEY]: [] });
  return jobs;
}

export async function loadMenuExports(): Promise<MenuExport[]> {
  const stored = await chrome.storage.local.get(MENU_EXPORTS_KEY);
  const list = stored[MENU_EXPORTS_KEY];
  if (!Array.isArray(list) || list.length === 0) {
    return [{ id: 'default', name: 'Original' }];
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
