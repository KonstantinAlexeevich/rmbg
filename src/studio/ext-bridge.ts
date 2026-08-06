import { base64ToBlob } from '../platform/base64';
import {
  BRIDGE_SOURCE,
  type ExtJob,
  type BridgeToPage,
} from '../shared/ext-protocol';
import { useStudioStore } from './state/store';
import { addFiles } from './state/orchestrator';
import { t } from './state/i18n';
import { postPageReady, syncExportsToExtension } from './ext-sync';
import { resolvePresetId } from './resolve-preset-id';

let pageReady = false;
const pendingJobs: ExtJob[] = [];

async function handleJob(job: ExtJob): Promise<void> {
  if (job.kind === 'error') {
    useStudioStore.getState().addToast('error', t.errorExtJob({ message: job.message }));
    return;
  }

  const blob = base64ToBlob(job.base64, job.mime);
  const file = new File([blob], job.name, { type: job.mime });
  if (job.kind === 'save') {
    const presetId = resolvePresetId(job.presetId, useStudioStore.getState().settings);
    await addFiles([file], { autoDownloadPresetId: presetId, ephemeral: true });
    return;
  }
  await addFiles([file]);
}

function onBridgeMessage(event: MessageEvent): void {
  if (event.origin !== window.location.origin) return;
  const data = event.data as BridgeToPage;
  if (typeof data !== 'object' || data === null || data.source !== BRIDGE_SOURCE) return;

  if (data.type === 'BRIDGE_READY') {
    if (pageReady) {
      syncExportsToExtension(useStudioStore.getState().settings);
      postPageReady();
    }
    return;
  }

  if (data.type === 'JOB') {
    if (!pageReady) {
      pendingJobs.push(data.job);
      return;
    }
    void handleJob(data.job);
  }
}

/** Слушать bridge до bootstrap — jobs буферизуются. */
export function startExtBridge(): void {
  window.addEventListener('message', onBridgeMessage);
}

/** Вызвать в конце bootstrap: синк экспортов + слив очереди. */
export function notifyExtBridgeReady(): void {
  pageReady = true;
  syncExportsToExtension(useStudioStore.getState().settings);
  postPageReady();
  // CS мог стартовать чуть позже PAGE_READY
  window.setTimeout(() => postPageReady(), 300);
  window.setTimeout(() => postPageReady(), 1000);
  for (const job of pendingJobs.splice(0)) {
    void handleJob(job);
  }
}
