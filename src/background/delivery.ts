import { STUDIO_WEB_URL } from '../platform/studio-url';
import { MSG_JOBS } from '../shared/ext-protocol';
import { claimJobs, enqueueJob } from './jobs';
import { resolveStudioOrigin } from './studio-origin';

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
      await chrome.tabs.sendMessage(tabId, { type: MSG_JOBS, jobs });
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
