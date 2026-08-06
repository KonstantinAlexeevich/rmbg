/** Чистая логика content-script bridge (без chrome.* / side effects при импорте). */

import {
  STUDIO_MARKER_ATTR,
  STUDIO_MARKER_VALUE,
} from '../platform/studio-url';
import {
  BRIDGE_SOURCE,
  type BridgeFromPage,
  type ExtJob,
} from '../shared/ext-protocol';

export function isStudioShell(
  doc: Pick<Document, 'documentElement'>,
  attr = STUDIO_MARKER_ATTR,
  value = STUDIO_MARKER_VALUE,
): boolean {
  return doc.documentElement?.getAttribute(attr) === value;
}

export function isBridgeFromPage(data: unknown): data is BridgeFromPage {
  if (typeof data !== 'object' || data === null) return false;
  return (data as BridgeFromPage).source === BRIDGE_SOURCE;
}

/** FIFO слив jobs в страницу только после PAGE_READY. */
export function flushJobsToPage(
  queue: ExtJob[],
  pageReady: boolean,
  postJob: (job: ExtJob) => void,
): void {
  if (!pageReady) return;
  while (queue.length > 0) {
    const job = queue.shift();
    if (job === undefined) break;
    postJob(job);
  }
}
