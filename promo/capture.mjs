#!/usr/bin/env node
/**
 * Drive the live web studio and refresh promo/captures (+ samples/out cutouts).
 * Usage: node promo/capture.mjs
 * Env: STUDIO_URL (default http://localhost:5173/studio), SKIP_SERVER=1 to not spawn Vite.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const capturesDir = join(__dirname, 'captures');
const samplesInDir = join(__dirname, 'samples', 'in');
const samplesOutDir = join(__dirname, 'samples', 'out');
/** Persistent profile so Cache Storage keeps the ONNX model between runs. */
const profileDir = join(__dirname, '.pw-profile');

const STUDIO_URL = process.env.STUDIO_URL ?? 'http://localhost:5173/studio';
const VIEWPORT = { width: 1280, height: 800 };
const SIDEBAR_VIEWPORT = { width: 1280, height: 916 };
const DPR = 2;
const READY_TIMEOUT_MS = 300_000;

/** Input basename → promo cutout filename (without .png). */
const CUTOUT_MAP = {
  '1-sneaker': 'sneaker',
  '3-helmet': 'helmet',
  '4-mug': 'mug',
  '5-plant': 'plant',
};

/**
 * Promo-only layout: studio cards are minmax(260px) which reads too chunky at
 * 1280×800 in CWS frames. Tighten the grid so more cards fit and stay legible.
 */
const PROMO_GRID_CSS = `
  main .grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)) !important;
  }
`;

function preset(id, name, patch = {}) {
  return {
    id,
    name,
    sizeMode: 'fixed',
    canvas: { width: 500, height: 500 },
    fit: {
      margin: { top: 0.1, right: 0.1, bottom: 0.1, left: 0.1 },
      mode: 'contain',
      allowZoom: false,
    },
    anchor: 'center',
    background: { kind: 'transparent' },
    output: { format: 'png', quality: 0.92 },
    ...patch,
  };
}

function promoSettings() {
  const amazon = preset('promo-amazon', '500px 1:1');
  const original = preset('promo-original', 'Original', { sizeMode: 'original' });
  const p720 = preset('promo-720p', '720p', {
    canvas: { width: 1280, height: 720 },
    fit: {
      margin: { top: 0.05, right: 0.05, bottom: 0.05, left: 0.05 },
      mode: 'contain',
      allowZoom: false,
    },
  });
  const white = preset('promo-white', 'Shop white', {
    canvas: { width: 1000, height: 1000 },
    background: { kind: 'solid', color: '#ffffff' },
  });
  const presets = [amazon, original, p720, white];
  return {
    version: 1,
    presets,
    activePresetId: amazon.id,
    exportPresetIds: presets.map((p) => p.id),
    edge: { threshold: 0, erode: 1, feather: 0 },
    ui: { locale: 'en' },
    backendOverride: 'auto',
    modelAssets: [],
  };
}

async function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(1500) });
      if (res.ok || res.status === 304) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Studio not reachable at ${url} within ${timeoutMs}ms`);
}

async function ensureServer() {
  if (process.env.SKIP_SERVER === '1') {
    await waitForServer(STUDIO_URL, 5_000);
    return () => {};
  }
  try {
    await waitForServer(STUDIO_URL, 2_000);
    console.log(`Reusing studio at ${STUDIO_URL}`);
    return () => {};
  } catch {
    // spawn below
  }
  console.log('Starting npm run dev:web …');
  const child = spawn('npm', ['run', 'dev:web'], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });
  let output = '';
  child.stdout?.on('data', (chunk) => {
    output += String(chunk);
  });
  child.stderr?.on('data', (chunk) => {
    output += String(chunk);
  });
  try {
    await waitForServer(STUDIO_URL, 60_000);
  } catch (e) {
    child.kill('SIGTERM');
    console.error(output);
    throw e;
  }
  return () => {
    child.kill('SIGTERM');
  };
}

async function resetStudioData(page) {
  await page.goto(STUDIO_URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(async () => {
    localStorage.clear();
    await new Promise((resolve) => {
      const req = indexedDB.deleteDatabase('rmbg');
      req.onsuccess = req.onerror = req.onblocked = () => resolve(undefined);
    });
  });
}

async function seedSettings(page) {
  const settings = promoSettings();
  await page.addInitScript((seed) => {
    localStorage.setItem('rmbg:settings', JSON.stringify(seed));
    // Force <a download> path — File System Access picker blocks headless runs.
    Object.defineProperty(window, 'showSaveFilePicker', {
      configurable: true,
      get() {
        return undefined;
      },
    });
    // Avoid warnNoPersist toast in promo frames (headless often denies persistence).
    if (navigator.storage && typeof navigator.storage.persist === 'function') {
      navigator.storage.persist = async () => true;
    }
  }, settings);
}

async function applyPromoChrome(page) {
  await page.addStyleTag({ content: PROMO_GRID_CSS });
}

async function dismissToasts(page) {
  const buttons = page.getByRole('button', { name: 'Dismiss' });
  for (let i = 0; i < 8; i++) {
    if ((await buttons.count()) === 0) return;
    await buttons.first().click();
    await page.waitForTimeout(40);
  }
}

async function shotViewport(page, outPath) {
  await dismissToasts(page);
  await page.screenshot({ path: outPath, type: 'png' });
  console.log(`  wrote ${outPath}`);
}

function listSampleFiles() {
  const files = readdirSync(samplesInDir)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .sort()
    .map((f) => join(samplesInDir, f));
  if (files.length === 0) throw new Error(`No samples in ${samplesInDir}`);
  return files;
}

async function importFiles(page, files) {
  await page.locator('input[type=file]').setInputFiles(files);
}

async function waitUntilAllReady(page, count) {
  await page.locator('[data-item-id]').first().waitFor({ timeout: READY_TIMEOUT_MS });
  await page.waitForFunction(
    (expected) => {
      const cards = [...document.querySelectorAll('[data-item-id]')];
      if (cards.length < expected) return false;
      return cards.every((card) => card.textContent?.includes('Ready'));
    },
    count,
    { timeout: READY_TIMEOUT_MS },
  );
}

async function setCompareSplit(page, ratio) {
  const stage = page.locator('.checkerboard.cursor-ew-resize');
  await stage.waitFor({ state: 'visible', timeout: 30_000 });
  const box = await stage.boundingBox();
  if (box === null) throw new Error('Compare stage has no box');
  const x = box.x + box.width * ratio;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 1, y);
  await page.mouse.up();
}

async function saveCutouts(page) {
  mkdirSync(samplesOutDir, { recursive: true });
  for (const [base, outName] of Object.entries(CUTOUT_MAP)) {
    const card = page.locator(`[data-item-id]`).filter({ hasText: base }).first();
    await card.waitFor({ state: 'visible' });
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 60_000 }),
      card.getByRole('button', { name: 'Download' }).click(),
    ]);
    const target = join(samplesOutDir, `${outName}.png`);
    await download.saveAs(target);
    console.log(`  cutout ${target}`);
  }
}

async function captureSidebar(page, outPath) {
  await page.setViewportSize(SIDEBAR_VIEWPORT);
  await page.getByRole('button', { name: 'Export settings' }).click();
  await page.getByRole('button', { name: 'Custom' }).click();
  await page.getByRole('button', { name: 'Solid color' }).click();
  await page.getByRole('button', { name: 'White', exact: true }).click();
  // Promo crop of the sidebar should not include the About footer link.
  await page.addStyleTag({
    content: 'aside.w-72 a[href*="about"] { display: none !important; }',
  });
  await page.waitForTimeout(200);
  await dismissToasts(page);
  const aside = page.locator('aside.w-72');
  await aside.screenshot({ path: outPath, type: 'png' });
  console.log(`  wrote ${outPath}`);
  await page.setViewportSize(VIEWPORT);
}

async function main() {
  mkdirSync(capturesDir, { recursive: true });
  mkdirSync(profileDir, { recursive: true });
  const stopServer = await ensureServer();
  const context = await chromium.launchPersistentContext(profileDir, {
    headless: true,
    viewport: VIEWPORT,
    deviceScaleFactor: DPR,
    locale: 'en-US',
    acceptDownloads: true,
  });
  try {
    const page = context.pages()[0] ?? (await context.newPage());
    const files = listSampleFiles();

    console.log('Resetting studio storage …');
    await resetStudioData(page);

    await seedSettings(page);
    await page.goto(STUDIO_URL, { waitUntil: 'domcontentloaded' });
    await page.getByText('Drop images here').waitFor({ timeout: 60_000 });
    await applyPromoChrome(page);

    console.log('Importing samples …');
    await importFiles(page, files);

    console.log('Waiting for all cards Ready …');
    await waitUntilAllReady(page, files.length);

    console.log('Capturing studio.png …');
    await shotViewport(page, join(capturesDir, 'studio.png'));

    console.log('Capturing before-after.png …');
    await page
      .locator('[data-item-id]')
      .filter({ hasText: '1-sneaker' })
      .getByRole('button', { name: 'Open preview' })
      .click();
    await page.getByAltText('After').waitFor({ timeout: 30_000 });
    await setCompareSplit(page, 0.4);
    await page.waitForTimeout(150);
    await shotViewport(page, join(capturesDir, 'before-after.png'));

    console.log('Capturing export.png …');
    await page.getByRole('button', { name: 'Back to grid' }).click();
    await page.locator('[data-item-id]').first().waitFor();
    await page.getByRole('button', { name: /Export ZIP/ }).click();
    await page.getByText('Exports to include').waitFor({ timeout: 10_000 });
    await shotViewport(page, join(capturesDir, 'export.png'));
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Cutouts must be downloaded while the active preset is still transparent.
    // captureSidebar flips it to solid white for the settings shot.
    console.log('Exporting cutouts to samples/out …');
    await saveCutouts(page);

    console.log('Capturing menu-solid.png …');
    await captureSidebar(page, join(capturesDir, 'menu-solid.png'));

    console.log('\nDone. Captures in promo/captures/, cutouts in promo/samples/out/');
  } finally {
    await context.close();
    stopServer();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
