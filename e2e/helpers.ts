import { expect, type Page } from '@playwright/test';
import { createReadStream } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { join } from 'node:path';

export const SAMPLE = join(process.cwd(), 'e2e/fixtures/1-sneaker.jpg');

export const E2E_PROFILE = join(process.cwd(), 'e2e/.pw-profile');
export const EXT_PROFILE = join(process.cwd(), 'e2e/.pw-ext-profile');
export const FP32_PROFILE = join(process.cwd(), 'e2e/.pw-fp32-profile');
export const FP32_EXT_PROFILE = join(process.cwd(), 'e2e/.pw-fp32-ext-profile');
export const EXT_PATH = join(process.cwd(), 'dist');

export const MODEL_Q8 = join(
  process.cwd(),
  'e2e/fixtures/isnet-general-use-q8.onnx',
);
export const MODEL_FP32 = join(
  process.cwd(),
  'e2e/fixtures/isnet-general-use.onnx',
);

export type ModelFixtureKind = 'q8' | 'fp32';

export const STUDIO_URL =
  process.env.STUDIO_URL ?? 'http://localhost:5173/studio';

/** Fail fast with a clear message if the fixture image is missing. */
export async function assertSampleExists(): Promise<void> {
  try {
    await access(SAMPLE);
  } catch {
    throw new Error(
      `E2E fixture missing: ${SAMPLE}. Place a test JPEG at e2e/fixtures/1-sneaker.jpg.`,
    );
  }
}

async function assertFixture(path: string, label: string): Promise<void> {
  try {
    await access(path);
  } catch {
    throw new Error(
      `E2E model missing: ${path} (${label}). Place the file in e2e/fixtures/ or run \`npm run e2e:fetch-models\` once.`,
    );
  }
}

/** Fail fast if required ONNX fixtures are absent (tests never download). */
export async function assertModelFixturesExist(
  kinds: ModelFixtureKind[] = ['q8'],
): Promise<void> {
  if (kinds.includes('q8')) await assertFixture(MODEL_Q8, 'q8');
  if (kinds.includes('fp32')) await assertFixture(MODEL_FP32, 'fp32');
}

const FIXTURE_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Expose-Headers': 'Content-Length',
  'Cross-Origin-Resource-Policy': 'cross-origin',
};

let fixtureServer: Server | undefined;
let fixtureBaseUrl: string | undefined;

/**
 * Local streaming server for ONNX fixtures.
 * Avoids Playwright route.fulfill({ path }) which loads the whole file into
 * Node/CDP memory and crashes Chromium on the ~168MB fp32 weights.
 */
async function ensureFixtureServer(): Promise<string> {
  if (fixtureBaseUrl !== undefined) return fixtureBaseUrl;

  const server = createServer((req, res) => {
    const path = req.url?.split('?')[0] ?? '';
    if (req.method === 'OPTIONS') {
      res.writeHead(204, FIXTURE_CORS);
      res.end();
      return;
    }

    let file: string | undefined;
    if (path === '/q8.onnx') file = MODEL_Q8;
    else if (path === '/fp32.onnx') file = MODEL_FP32;
    else {
      res.writeHead(404);
      res.end('not found');
      return;
    }

    void stat(file).then(
      (st) => {
        res.writeHead(200, {
          ...FIXTURE_CORS,
          'Content-Type': 'application/octet-stream',
          'Content-Length': String(st.size),
        });
        if (req.method === 'HEAD') {
          res.end();
          return;
        }
        createReadStream(file!).pipe(res);
      },
      () => {
        res.writeHead(404);
        res.end('missing fixture');
      },
    );
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const addr = server.address();
  if (addr === null || typeof addr === 'string') {
    throw new Error('fixture server failed to bind');
  }
  fixtureServer = server;
  fixtureBaseUrl = `http://127.0.0.1:${addr.port}`;
  return fixtureBaseUrl;
}

/**
 * Serve ONNX from e2e/fixtures — never hit the network in tests.
 * Call assertModelFixturesExist with the same kinds first.
 *
 * Patches window.fetch to hit a local streaming HTTP server (avoids
 * Playwright route.fulfill of ~168MB which OOMs Chromium, and avoids
 * route.continue https→http which Playwright rejects).
 */
export async function mockModelDownload(
  page: Page,
  kinds: ModelFixtureKind[] = ['q8'],
): Promise<void> {
  const base = await ensureFixtureServer();
  const map: { q8?: string; fp32?: string } = {};
  if (kinds.includes('q8')) map.q8 = `${base}/q8.onnx`;
  if (kinds.includes('fp32')) map.fp32 = `${base}/fp32.onnx`;

  await page.addInitScript((local) => {
    const original = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const raw =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      let rewritten = raw;
      if (local.q8 !== undefined && raw.includes('isnet-general-use-q8.onnx')) {
        rewritten = local.q8;
      } else if (
        local.fp32 !== undefined &&
        /isnet-general-use\.onnx(?:\?|$)/.test(raw)
      ) {
        rewritten = local.fp32;
      }
      if (rewritten === raw) return original(input, init);
      return original(rewritten, init);
    };
  }, map);
}

export async function attachConsole(page: Page): Promise<string[]> {
  const lines: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      lines.push(`[${msg.type()}] ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => {
    lines.push(`[pageerror] ${err.message}`);
  });
  return lines;
}

/** Clear IDB + settings + Cache Storage between tests. */
export async function resetStudioSession(page: Page): Promise<void> {
  await page.goto('/studio', { waitUntil: 'domcontentloaded' });
  await page.evaluate(async () => {
    localStorage.clear();
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase('rmbg');
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
  });
  // Unload the app so an in-flight WebGPU/model pipeline cannot crash the browser
  // after we wiped its storage mid-flight.
  await page.goto('about:blank');
}

/** Headless-friendly shims + seeded settings (runs before every document). */
export async function installStudioInit(
  page: Page,
  settingsPatch: Record<string, unknown> = {},
): Promise<void> {
  await page.addInitScript((patch) => {
    Object.defineProperty(window, 'showSaveFilePicker', {
      configurable: true,
      get() {
        return undefined;
      },
    });
    if (navigator.storage && typeof navigator.storage.persist === 'function') {
      navigator.storage.persist = async () => true;
    }
    if (navigator.storage && typeof navigator.storage.persisted === 'function') {
      navigator.storage.persisted = async () => true;
    }

    const key = 'rmbg:settings';
    if (localStorage.getItem(key) !== null) return;

    const base = {
      version: 1,
      presets: [
        {
          id: 'e2e-original',
          name: 'Original',
          sizeMode: 'original',
          canvas: { width: 1000, height: 1000 },
          fit: {
            margin: { top: 0.05, right: 0.05, bottom: 0.05, left: 0.05 },
            mode: 'contain',
            allowZoom: false,
          },
          anchor: 'center',
          background: { kind: 'transparent' },
          output: { format: 'png', quality: 0.92 },
        },
      ],
      activePresetId: 'e2e-original',
      exportPresetIds: ['e2e-original'],
      edge: { threshold: 0, erode: 1, feather: 0 },
      ui: { locale: 'en' },
      backendOverride: 'wasm',
      modelAssets: [],
      ...patch,
    };
    localStorage.setItem(key, JSON.stringify(base));
  }, settingsPatch);
}

export async function openStudio(page: Page): Promise<void> {
  await page.goto('/studio', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('drop-zone')).toBeVisible({ timeout: 60_000 });
}

export async function waitForModelReady(page: Page, logs: string[]): Promise<void> {
  const status = page.getByTestId('model-status');
  await status.waitFor({ state: 'attached', timeout: 60_000 });

  const deadline = Date.now() + 300_000;
  while (Date.now() < deadline) {
    const phase = await status.getAttribute('data-phase');
    if (phase === 'ready') return;
    if (phase === 'failed' || phase === 'canceled' || phase === 'evicted') {
      throw new Error(
        `Model not ready (phase=${phase}). Console:\n${logs.slice(-20).join('\n')}`,
      );
    }
    await page.waitForTimeout(500);
  }
  const phase = await status.getAttribute('data-phase');
  throw new Error(
    `Timed out waiting for model ready (last phase=${phase}). Console:\n${logs.slice(-20).join('\n')}`,
  );
}

/** Guard against silent WebGPU→WASM fallback (would exercise q8 instead of fp32). */
export async function assertBackend(
  page: Page,
  backend: 'webgpu' | 'wasm',
): Promise<void> {
  await expect(page.getByTestId('backend-badge')).toHaveAttribute(
    'data-backend',
    backend,
    { timeout: 30_000 },
  );
}

export async function importSample(page: Page): Promise<void> {
  await page.getByTestId('file-input').setInputFiles(SAMPLE);
}

export async function waitUntilReady(page: Page): Promise<void> {
  const card = page.getByTestId('item-card').first();
  await card.waitFor({ state: 'visible', timeout: 300_000 });
  await expect(card).toHaveAttribute('data-status', 'done', { timeout: 300_000 });
  await expect(card).toContainText('Ready');
}

export async function readSampleAsJobBase64(): Promise<{
  base64: string;
  mime: string;
  name: string;
}> {
  const { readFile } = await import('node:fs/promises');
  const bytes = await readFile(SAMPLE);
  return {
    base64: bytes.toString('base64'),
    mime: 'image/jpeg',
    name: '1-sneaker.jpg',
  };
}
