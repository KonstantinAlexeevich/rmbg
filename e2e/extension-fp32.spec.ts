import {
  expect,
  test as base,
  chromium,
  type BrowserContext,
  type Page,
  type Worker,
} from '@playwright/test';
import { access, mkdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  assertBackend,
  assertModelFixturesExist,
  assertSampleExists,
  attachConsole,
  EXT_PATH,
  FP32_EXT_PROFILE,
  installStudioInit,
  mockModelDownload,
  readSampleAsJobBase64,
  resetStudioSession,
  STUDIO_URL,
  waitForModelReady,
  waitUntilReady,
} from './helpers';

const FP32_KINDS = ['q8', 'fp32'] as const;

type Fixtures = {
  context: BrowserContext;
  page: Page;
  extensionWorker: Worker;
};

async function waitForExtensionWorker(context: BrowserContext): Promise<Worker> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const workers = context.serviceWorkers();
    const sw = workers.find((w) => w.url().startsWith('chrome-extension://'));
    if (sw !== undefined) return sw;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(
    'Extension service worker did not start. MV3 extensions require headed Chromium in Playwright.',
  );
}

/**
 * Enqueue a job in the extension SW and deliver it to the studio tab
 * (same path as after context-menu Add/Save — without clicking Chrome's native menu).
 */
async function injectJobViaExtension(
  worker: Worker,
  job: Record<string, unknown>,
  studioUrl: string,
): Promise<{ ok: boolean; tabId: number | undefined }> {
  return worker.evaluate(
    async ({ job: j, studioUrl: url }) => {
      const EXT_JOBS_KEY = 'extJobs';
      const MSG_JOBS = 'png-maker:jobs';

      const stored = await chrome.storage.session.get(EXT_JOBS_KEY);
      const queue = Array.isArray(stored[EXT_JOBS_KEY])
        ? [...(stored[EXT_JOBS_KEY] as unknown[])]
        : [];
      queue.push(j);
      await chrome.storage.session.set({ [EXT_JOBS_KEY]: queue });

      const origin = new URL(url).origin;
      const tabs = await chrome.tabs.query({ url: [`${origin}/*`] });
      let tabId = tabs[0]?.id;
      if (tabId === undefined) {
        const created = await chrome.tabs.create({ url, active: true });
        tabId = created.id;
      }

      const claimed = await chrome.storage.session.get(EXT_JOBS_KEY);
      const jobs = Array.isArray(claimed[EXT_JOBS_KEY])
        ? (claimed[EXT_JOBS_KEY] as unknown[])
        : [];
      await chrome.storage.session.set({ [EXT_JOBS_KEY]: [] });

      if (tabId === undefined) return { ok: false, tabId: undefined };

      for (let attempt = 0; attempt < 40; attempt++) {
        try {
          await chrome.tabs.sendMessage(tabId, { type: MSG_JOBS, jobs });
          return { ok: true, tabId };
        } catch {
          await new Promise((r) => setTimeout(r, 250));
        }
      }
      await chrome.storage.session.set({ [EXT_JOBS_KEY]: jobs });
      return { ok: false, tabId };
    },
    { job, studioUrl },
  );
}

const test = base.extend<Fixtures>({
  context: async ({}, use) => {
    const extPath = resolve(EXT_PATH);
    await access(extPath).catch(() => {
      throw new Error(
        `Extension package missing at ${extPath}. Run \`npm run build\` before extension e2e.`,
      );
    });
    await mkdir(FP32_EXT_PROFILE, { recursive: true });
    const context = await chromium.launchPersistentContext(FP32_EXT_PROFILE, {
      headless: false,
      viewport: { width: 1280, height: 800 },
      locale: 'en-US',
      acceptDownloads: true,
      args: [
        `--disable-extensions-except=${extPath}`,
        `--load-extension=${extPath}`,
      ],
    });
    await use(context);
    await context.close();
  },
  page: async ({ context }, use) => {
    const page = context.pages()[0] ?? (await context.newPage());
    await use(page);
  },
  extensionWorker: async ({ context }, use) => {
    const worker = await waitForExtensionWorker(context);
    await use(worker);
  },
});

test.describe('extension bridge (fp32 / WebGPU)', () => {
  test.beforeAll(async () => {
    await assertSampleExists();
    await assertModelFixturesExist([...FP32_KINDS]);
  });

  test('Add job lands in studio grid and becomes Ready on GPU', async ({
    page,
    extensionWorker,
  }) => {
    test.setTimeout(420_000);
    const logs = await attachConsole(page);
    await installStudioInit(page, { backendOverride: 'webgpu' });
    await mockModelDownload(page, [...FP32_KINDS]);
    await resetStudioSession(page);
    await page.goto(STUDIO_URL, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('drop-zone')).toBeVisible({ timeout: 60_000 });
    await waitForModelReady(page, logs);
    await assertBackend(page, 'webgpu');

    const image = await readSampleAsJobBase64();
    const result = await injectJobViaExtension(
      extensionWorker,
      {
        id: crypto.randomUUID(),
        kind: 'add',
        base64: image.base64,
        mime: image.mime,
        name: image.name,
      },
      STUDIO_URL,
    );
    expect(result.ok).toBe(true);

    await waitUntilReady(page);
    await expect(page.getByTestId('item-card')).toHaveCount(1);
    await assertBackend(page, 'webgpu');
  });

  test('Save job downloads cutout on GPU without leaving a grid card', async ({
    page,
    extensionWorker,
  }) => {
    test.setTimeout(420_000);
    const logs = await attachConsole(page);
    await installStudioInit(page, { backendOverride: 'webgpu' });
    await mockModelDownload(page, [...FP32_KINDS]);
    await resetStudioSession(page);
    await page.goto(STUDIO_URL, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('drop-zone')).toBeVisible({ timeout: 60_000 });
    await waitForModelReady(page, logs);
    await assertBackend(page, 'webgpu');

    const image = await readSampleAsJobBase64();
    const downloadPromise = page.waitForEvent('download', { timeout: 300_000 });

    const result = await injectJobViaExtension(
      extensionWorker,
      {
        id: crypto.randomUUID(),
        kind: 'save',
        presetId: 'e2e-original',
        base64: image.base64,
        mime: image.mime,
        name: image.name,
      },
      STUDIO_URL,
    );
    expect(result.ok).toBe(true);

    const download = await downloadPromise;
    expect(await download.failure()).toBeNull();
    expect(download.suggestedFilename()).toMatch(/\.(png|jpe?g|webp)$/i);
    const path = await download.path();
    expect(path).toBeTruthy();
    expect((await stat(path!)).size).toBeGreaterThan(100);

    await expect(page.getByTestId('item-card')).toHaveCount(0, { timeout: 30_000 });
    await assertBackend(page, 'webgpu');
  });
});
