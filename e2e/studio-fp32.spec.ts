import { expect, test as base, chromium, type BrowserContext, type Page } from '@playwright/test';
import { mkdir, stat } from 'node:fs/promises';
import {
  assertBackend,
  assertModelFixturesExist,
  assertSampleExists,
  attachConsole,
  FP32_PROFILE,
  importSample,
  installStudioInit,
  mockModelDownload,
  openStudio,
  resetStudioSession,
  waitForModelReady,
  waitUntilReady,
} from './helpers';

const FP32_KINDS = ['q8', 'fp32'] as const;

type Fixtures = {
  context: BrowserContext;
  page: Page;
};

const test = base.extend<Fixtures>({
  context: async ({}, use) => {
    await mkdir(FP32_PROFILE, { recursive: true });
    // WebGPU needs a real GPU path — headed Chromium (same as extension e2e).
    const context = await chromium.launchPersistentContext(FP32_PROFILE, {
      headless: false,
      viewport: { width: 1280, height: 800 },
      locale: 'en-US',
      acceptDownloads: true,
    });
    await use(context);
    await context.close();
  },
  page: async ({ context }, use) => {
    const page = context.pages()[0] ?? (await context.newPage());
    await use(page);
  },
});

test.describe('studio smoke (fp32 / WebGPU)', () => {
  test.beforeAll(async () => {
    await assertSampleExists();
    await assertModelFixturesExist([...FP32_KINDS]);
  });

  test('processes sample to Ready on GPU, downloads cutout, exports ZIP', async ({
    page,
  }) => {
    test.setTimeout(420_000);
    const logs = await attachConsole(page);
    await installStudioInit(page, { backendOverride: 'webgpu' });
    await mockModelDownload(page, [...FP32_KINDS]);
    await resetStudioSession(page);
    await openStudio(page);

    await waitForModelReady(page, logs);
    await assertBackend(page, 'webgpu');
    await importSample(page);
    await waitUntilReady(page);
    await assertBackend(page, 'webgpu');

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 60_000 }),
      page.getByTestId('item-card').first().getByRole('button', { name: 'Download' }).click(),
    ]);
    expect(await download.failure()).toBeNull();
    expect(download.suggestedFilename()).toMatch(/\.png$/i);
    const cutoutPath = await download.path();
    expect(cutoutPath).toBeTruthy();
    expect((await stat(cutoutPath!)).size).toBeGreaterThan(100);

    const [zipDownload] = await Promise.all([
      page.waitForEvent('download', { timeout: 120_000 }),
      page.getByTestId('export-zip').click(),
    ]);
    expect(await zipDownload.failure()).toBeNull();
    expect(zipDownload.suggestedFilename()).toMatch(/\.zip$/i);
    const zipPath = await zipDownload.path();
    expect(zipPath).toBeTruthy();
    expect((await stat(zipPath!)).size).toBeGreaterThan(100);
  });
});
