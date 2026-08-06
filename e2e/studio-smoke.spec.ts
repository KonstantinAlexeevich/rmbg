import { expect, test as base, chromium, type BrowserContext, type Page } from '@playwright/test';
import { mkdir, stat } from 'node:fs/promises';
import {
  assertModelFixturesExist,
  assertSampleExists,
  attachConsole,
  E2E_PROFILE,
  importSample,
  installStudioInit,
  mockModelDownload,
  openStudio,
  resetStudioSession,
  waitForModelReady,
  waitUntilReady,
} from './helpers';

type Fixtures = {
  context: BrowserContext;
  page: Page;
};

const test = base.extend<Fixtures>({
  context: async ({}, use) => {
    await mkdir(E2E_PROFILE, { recursive: true });
    const context = await chromium.launchPersistentContext(E2E_PROFILE, {
      headless: true,
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

test.describe('studio smoke', () => {
  test.beforeAll(async () => {
    await assertSampleExists();
    await assertModelFixturesExist(['q8']);
  });

  test('processes sample to Ready, downloads cutout, exports ZIP', async ({
    page,
  }) => {
    test.setTimeout(420_000);
    const logs = await attachConsole(page);
    await installStudioInit(page);
    await mockModelDownload(page, ['q8']);
    await resetStudioSession(page);
    await openStudio(page);

    await waitForModelReady(page, logs);
    await importSample(page);
    await waitUntilReady(page);

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

  test('persists edge settings across reload', async ({ page }) => {
    test.setTimeout(180_000);
    const logs = await attachConsole(page);
    await installStudioInit(page, {
      edge: { threshold: 0.25, erode: 2, feather: 3 },
    });
    await mockModelDownload(page, ['q8']);
    await resetStudioSession(page);
    await openStudio(page);
    await waitForModelReady(page, logs);

    const thresholdSlider = page
      .locator('label', { hasText: 'Threshold' })
      .locator('input[type=range]');
    await thresholdSlider.waitFor({ state: 'visible', timeout: 30_000 });
    await thresholdSlider.evaluate((input: HTMLInputElement) => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set;
      setter?.call(input, '0.4');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await expect
      .poll(async () => {
        const raw = await page.evaluate(() => localStorage.getItem('rmbg:settings'));
        if (raw === null) return null;
        return (JSON.parse(raw) as { edge?: { threshold?: number } }).edge?.threshold;
      })
      .toBeCloseTo(0.4, 5);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('drop-zone')).toBeVisible({ timeout: 60_000 });

    const after = await page.evaluate(() => {
      const raw = localStorage.getItem('rmbg:settings');
      return raw === null ? null : JSON.parse(raw);
    });
    expect(after?.edge?.threshold).toBeCloseTo(0.4, 5);
    expect(after?.edge?.erode).toBe(2);
    expect(after?.edge?.feather).toBe(3);
  });
});
