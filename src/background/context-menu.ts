import {
  STUDIO_WEB_URL,
  contextMenuDocumentUrlPatterns,
  originsMatch,
} from '../platform/studio-url';
import {
  claimJobs,
  enqueueJob,
  loadMenuExports,
  type ExtJob,
  MENU_EXPORTS_KEY,
} from './jobs';
import { resolveStudioOrigin } from './studio-origin';
import {
  beginImageHostAccess,
  extractImageForContextMenu,
} from './extract-image';

const MENU_ADD = 'png-maker-add';
const MENU_SAVE_PARENT = 'png-maker-save';
const MENU_SAVE_PREFIX = 'png-maker-save:';

function menuLocale(): 'ru' | 'en' {
  const lang = chrome.i18n.getUILanguage().toLowerCase();
  return lang.startsWith('ru') ? 'ru' : 'en';
}

function labels(locale: 'ru' | 'en'): { add: string; save: string } {
  if (locale === 'ru') {
    return {
      add: 'Добавить в PNG Maker',
      save: 'Сохранить с экспортом',
    };
  }
  return {
    add: 'Add to PNG Maker',
    save: 'Save with export',
  };
}

async function isStudioDocumentUrl(url: string): Promise<boolean> {
  if (url === '') return false;
  const origin = await resolveStudioOrigin();
  return originsMatch(url, origin);
}

let rebuildQueue: Promise<void> = Promise.resolve();

export function rebuildContextMenus(): Promise<void> {
  rebuildQueue = rebuildQueue.then(rebuildContextMenusNow, rebuildContextMenusNow);
  return rebuildQueue;
}

async function rebuildContextMenusNow(): Promise<void> {
  await chrome.contextMenus.removeAll();
  const locale = menuLocale();
  const text = labels(locale);
  const exports = await loadMenuExports();
  const seen = new Set<string>();
  const documentUrlPatterns = contextMenuDocumentUrlPatterns();

  await createMenu({
    id: MENU_ADD,
    title: text.add,
    contexts: ['image'],
    documentUrlPatterns,
  });
  await createMenu({
    id: MENU_SAVE_PARENT,
    title: text.save,
    contexts: ['image'],
    documentUrlPatterns,
  });
  for (const item of exports) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    await createMenu({
      id: `${MENU_SAVE_PREFIX}${item.id}`,
      parentId: MENU_SAVE_PARENT,
      title: item.name,
      contexts: ['image'],
      documentUrlPatterns,
    });
  }
}

function createMenu(createProperties: chrome.contextMenus.CreateProperties): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.contextMenus.create(createProperties, () => {
      const err = chrome.runtime.lastError;
      if (err !== undefined) {
        reject(new Error(err.message));
        return;
      }
      resolve();
    });
  });
}

export function watchMenuExports(): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || changes[MENU_EXPORTS_KEY] === undefined) return;
    void rebuildContextMenus();
  });
}

export async function openStudioTab(options?: {
  focus?: boolean;
}): Promise<number | undefined> {
  const focus = options?.focus !== false;
  const origin = await resolveStudioOrigin();
  const patterns = [`${origin}/*`];
  if (!STUDIO_WEB_URL.startsWith(origin)) {
    patterns.push(`${STUDIO_WEB_URL}*`);
  }
  const tabs = await chrome.tabs.query({ url: patterns });
  const existing = tabs[0];
  if (existing !== undefined && existing.id !== undefined) {
    if (focus) {
      await chrome.tabs.update(existing.id, { active: true });
      if (existing.windowId !== undefined) {
        await chrome.windows.update(existing.windowId, { focused: true });
      }
    }
    return existing.id;
  }
  const created = await chrome.tabs.create({ url: STUDIO_WEB_URL, active: focus });
  return created.id;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function deliverPendingJobsToStudio(
  tabId: number | undefined,
): Promise<void> {
  if (tabId === undefined) return;
  const jobs = await claimJobs();
  if (jobs.length === 0) return;

  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      await chrome.tabs.sendMessage(tabId, { type: 'png-maker:jobs', jobs });
      return;
    } catch {
      await sleep(250);
    }
  }

  for (const job of jobs) {
    await enqueueJob(job);
  }
  console.warn('PNG Maker: failed to deliver jobs to studio tab', tabId);
}

export async function onContextMenuClicked(
  info: chrome.contextMenus.OnClickData,
  tab: chrome.tabs.Tab | undefined,
): Promise<void> {
  const pageUrl = info.pageUrl ?? info.frameUrl ?? '';
  const srcUrl = info.srcUrl ?? '';
  const sourceTabId = tab?.id;

  // До любого await — иначе permissions.request не покажет диалог.
  const hostAccess = beginImageHostAccess(srcUrl, pageUrl);

  if (await isStudioDocumentUrl(pageUrl)) return;

  const menuId = typeof info.menuItemId === 'string' ? info.menuItemId : String(info.menuItemId);
  if (menuId === MENU_SAVE_PARENT) return;
  const silent = menuId.startsWith(MENU_SAVE_PREFIX);

  if (srcUrl === '') {
    await enqueueJob({
      id: crypto.randomUUID(),
      kind: 'error',
      message: 'No image URL',
    });
    const studioTabId = await openStudioTab({ focus: !silent });
    await deliverPendingJobsToStudio(studioTabId);
    return;
  }

  let job: ExtJob;
  try {
    const image = await extractImageForContextMenu(srcUrl, sourceTabId, hostAccess);
    if (menuId === MENU_ADD) {
      job = {
        id: crypto.randomUUID(),
        kind: 'add',
        base64: image.base64,
        mime: image.mime,
        name: image.name,
      };
    } else if (menuId.startsWith(MENU_SAVE_PREFIX)) {
      const presetId = menuId.slice(MENU_SAVE_PREFIX.length);
      job = {
        id: crypto.randomUUID(),
        kind: 'save',
        presetId,
        base64: image.base64,
        mime: image.mime,
        name: image.name,
      };
    } else {
      return;
    }
  } catch (e) {
    job = {
      id: crypto.randomUUID(),
      kind: 'error',
      message: e instanceof Error ? e.message : String(e),
    };
  }

  await enqueueJob(job);
  // «Save with export» — тихо: студия в фоне, карточка ephemeral
  const studioTabId = await openStudioTab({ focus: !silent });
  await deliverPendingJobsToStudio(studioTabId);
}
