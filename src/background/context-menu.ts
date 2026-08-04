import {
  contextMenuDocumentUrlPatterns,
  originsMatch,
} from '../platform/studio-url';
import {
  MENU_ADD,
  MENU_EXPORTS_KEY,
  MENU_SAVE_PARENT,
  MENU_SAVE_PREFIX,
  type ExtJob,
} from '../shared/ext-protocol';
import { enqueueJob, loadMenuExports } from './jobs';
import { resolveStudioOrigin } from './studio-origin';
import {
  beginImageHostAccess,
  extractImageForContextMenu,
} from './extract-image';
import { deliverPendingJobsToStudio, openStudioTab } from './delivery';

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
  const exports = await loadMenuExports();
  const seen = new Set<string>();
  const documentUrlPatterns = contextMenuDocumentUrlPatterns();

  await createMenu({
    id: MENU_ADD,
    title: chrome.i18n.getMessage('menuAdd'),
    contexts: ['image'],
    documentUrlPatterns,
  });
  await createMenu({
    id: MENU_SAVE_PARENT,
    title: chrome.i18n.getMessage('menuSave'),
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
  // «Save without background» — тихо: студия в фоне, карточка ephemeral
  const studioTabId = await openStudioTab({ focus: !silent });
  await deliverPendingJobsToStudio(studioTabId);
}
