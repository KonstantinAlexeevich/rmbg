// Service worker MV3: открытие студии, контекстное меню, доставка jobs.
// Обработки изображений здесь нет: SW засыпает, WebGPU недоступен.
import {
  onContextMenuClicked,
  rebuildContextMenus,
  watchMenuExports,
} from './context-menu';
import { deliverPendingJobsToStudio, openStudioTab } from './delivery';
import { saveStudioOrigin } from './studio-origin';
import { MSG_PULL_JOBS, MSG_STUDIO_READY } from '../shared/ext-protocol';

async function initSessionAccess(): Promise<void> {
  // По умолчанию session storage недоступен content scripts.
  try {
    await chrome.storage.session.setAccessLevel({
      accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS',
    });
  } catch {
    // ignore — основной путь доставки: sendMessage с payload
  }
}

chrome.action.onClicked.addListener(() => {
  void openStudioTab();
});

chrome.runtime.onInstalled.addListener(() => {
  void initSessionAccess();
  void rebuildContextMenus();
});

void initSessionAccess();
watchMenuExports();

chrome.contextMenus.onClicked.addListener((info, tab) => {
  void onContextMenuClicked(info, tab);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === MSG_STUDIO_READY && typeof message.origin === 'string') {
    void saveStudioOrigin(message.origin);
    sendResponse({ ok: true });
    return;
  }
  if (message?.type === MSG_PULL_JOBS) {
    const tabId = sender.tab?.id;
    void deliverPendingJobsToStudio(tabId).then(() => sendResponse({ ok: true }));
    return true;
  }
});
