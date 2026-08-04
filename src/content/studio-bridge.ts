/** Content script только на origin студии: chrome.runtime ↔ window.postMessage. */

const BRIDGE_SOURCE = 'png-maker-bridge' as const;
const MENU_EXPORTS_KEY = 'menuExports';
const STUDIO_ORIGIN_KEY = 'studioOrigin';
const STUDIO_MARKER_ATTR = 'data-png-maker-studio';
const STUDIO_MARKER_VALUE = '1';

type ExtJob =
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

type BridgeToPage =
  | { source: typeof BRIDGE_SOURCE; type: 'JOB'; job: ExtJob }
  | { source: typeof BRIDGE_SOURCE; type: 'BRIDGE_READY' };

type BridgeFromPage =
  | {
      source: typeof BRIDGE_SOURCE;
      type: 'SYNC_EXPORTS';
      exports: { id: string; name: string }[];
    }
  | { source: typeof BRIDGE_SOURCE; type: 'PAGE_READY' };

function isStudioShell(): boolean {
  return (
    document.documentElement?.getAttribute(STUDIO_MARKER_ATTR) === STUDIO_MARKER_VALUE
  );
}

function postToPage(message: BridgeToPage): void {
  window.postMessage(message, window.location.origin);
}

async function saveMenuExports(
  exports: { id: string; name: string }[],
): Promise<void> {
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
      type: 'png-maker:studio-ready',
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
      // попросить SW отдать накопленные jobs (на случай если claim пришёл раньше CS)
      try {
        void chrome.runtime.sendMessage({ type: 'png-maker:pull-jobs' });
      } catch {
        // ignore
      }
    }
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'png-maker:jobs' && Array.isArray(message.jobs)) {
      enqueueForPage(message.jobs as ExtJob[]);
      sendResponse({ ok: true });
      return true;
    }
    if (message?.type === 'png-maker:claim-jobs') {
      // legacy ping: попросить SW прислать jobs заново
      try {
        void chrome.runtime.sendMessage({ type: 'png-maker:pull-jobs' });
      } catch {
        // ignore
      }
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
