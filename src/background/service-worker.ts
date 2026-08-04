// Service worker MV3: открытие студии, контекстное меню, доставка jobs.
// Обработки изображений здесь нет: SW засыпает, WebGPU недоступен.
import {
  deliverPendingJobsToStudio,
  onContextMenuClicked,
  openStudioTab,
  rebuildContextMenus,
  watchMenuExports,
} from './context-menu';
import { saveStudioOrigin } from './studio-origin';

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
  if (message?.type === 'png-maker:ping') {
    sendResponse({ ok: true });
    return;
  }
  if (message?.type === 'png-maker:studio-ready' && typeof message.origin === 'string') {
    void saveStudioOrigin(message.origin);
    sendResponse({ ok: true });
    return;
  }
  if (message?.type === 'png-maker:pull-jobs') {
    const tabId = sender.tab?.id;
    void deliverPendingJobsToStudio(tabId).then(() => sendResponse({ ok: true }));
    return true;
  }
});
