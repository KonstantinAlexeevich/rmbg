/** Content script только на origin студии: chrome.runtime ↔ window.postMessage. */

import {
  STUDIO_MARKER_ATTR,
  STUDIO_MARKER_VALUE,
} from '../platform/studio-url';
import {
  BRIDGE_SOURCE,
  MENU_EXPORTS_KEY,
  MSG_JOBS,
  MSG_PULL_JOBS,
  MSG_STUDIO_READY,
  STUDIO_ORIGIN_KEY,
  type BridgeFromPage,
  type BridgeToPage,
  type ExtJob,
  type MenuExport,
} from '../shared/ext-protocol';

function isStudioShell(): boolean {
  return (
    document.documentElement?.getAttribute(STUDIO_MARKER_ATTR) === STUDIO_MARKER_VALUE
  );
}

function postToPage(message: BridgeToPage): void {
  window.postMessage(message, window.location.origin);
}

async function saveMenuExports(exports: MenuExport[]): Promise<void> {
  await chrome.storage.local.set({ [MENU_EXPORTS_KEY]: exports });
}

// Не слать JOB в page до PAGE_READY — иначе postMessage теряется.
let pageReady = false;
const queue: ExtJob[] = [];

function enqueueForPage(jobs: ExtJob[]): void {
  for (const job of jobs) queue.push(job);
  flushQueueToPage();
}

function flushQueueToPage(): void {
  if (!pageReady) return;
  while (queue.length > 0) {
    const job = queue.shift();
    if (job === undefined) break;
    postToPage({ source: BRIDGE_SOURCE, type: 'JOB', job });
  }
}

function isFromPage(data: unknown): data is BridgeFromPage {
  if (typeof data !== 'object' || data === null) return false;
  return (data as BridgeFromPage).source === BRIDGE_SOURCE;
}

let started = false;

function startBridge(): void {
  if (started) return;
  started = true;

  void chrome.storage.local.set({ [STUDIO_ORIGIN_KEY]: window.location.origin });
  try {
    void chrome.runtime.sendMessage({
      type: MSG_STUDIO_READY,
      origin: window.location.origin,
    });
  } catch {
    // SW может спать — origin уже в storage
  }

  window.addEventListener('message', (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;
    if (!isFromPage(event.data)) return;

    if (event.data.type === 'SYNC_EXPORTS') {
      void saveMenuExports(event.data.exports);
      return;
    }
    if (event.data.type === 'PAGE_READY') {
      pageReady = true;
      flushQueueToPage();
      try {
        void chrome.runtime.sendMessage({ type: MSG_PULL_JOBS });
      } catch {
        // ignore
      }
    }
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === MSG_JOBS && Array.isArray(message.jobs)) {
      enqueueForPage(message.jobs as ExtJob[]);
      sendResponse({ ok: true });
      return true;
    }
    return false;
  });

  postToPage({ source: BRIDGE_SOURCE, type: 'BRIDGE_READY' });
}

function tryStart(): boolean {
  if (!isStudioShell()) return false;
  startBridge();
  return true;
}

if (!tryStart()) {
  const observer = new MutationObserver(() => {
    if (tryStart()) observer.disconnect();
  });
  observer.observe(document, { childList: true, subtree: true, attributes: true });
  document.addEventListener(
    'DOMContentLoaded',
    () => {
      tryStart();
      observer.disconnect();
    },
    { once: true },
  );
}
