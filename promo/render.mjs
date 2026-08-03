#!/usr/bin/env node
/**
 * Render promo HTML templates to exact CWS sizes via headless Chrome + sips.
 * Usage: node promo/render.mjs
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = __dirname;
const outDir = join(root, 'out');
const templatesDir = join(root, 'templates');

const CHROME =
  process.env.CHROME_PATH ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const jobs = [
  { file: '01-edges.html', out: '01-edges.png', w: 1280, h: 800 },
  { file: '02-hero.html', out: '02-hero.png', w: 1280, h: 800 },
  { file: '03-presets.html', out: '03-presets.png', w: 1280, h: 800 },
  { file: '04-canvas.html', out: '04-canvas.png', w: 1280, h: 800 },
  { file: '05-privacy.html', out: '05-privacy.png', w: 1280, h: 800 },
  { file: 'tile-440.html', out: 'tile-440.png', w: 440, h: 280 },
  { file: 'marquee-1400.html', out: 'marquee-1400.png', w: 1400, h: 560 },
];

mkdirSync(outDir, { recursive: true });

if (!existsSync(CHROME)) {
  console.error(`Chrome not found at ${CHROME}`);
  process.exit(1);
}

function run(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8' });
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout || `${cmd} failed`);
    process.exit(r.status ?? 1);
  }
  return r.stdout;
}

function sipsInfo(path) {
  const out = run('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', '-g', 'hasAlpha', path]);
  const width = Number(/pixelWidth:\s*(\d+)/.exec(out)?.[1] ?? 0);
  const height = Number(/pixelHeight:\s*(\d+)/.exec(out)?.[1] ?? 0);
  const hasAlpha = /hasAlpha:\s*yes/i.test(out);
  return { width, height, hasAlpha };
}

function flattenAlpha(pngPath, jpegPath) {
  // sips can write JPEG which drops alpha; keep PNG by compositing on white when needed.
  run('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '95', pngPath, '--out', jpegPath]);
}

for (const job of jobs) {
  const htmlPath = join(templatesDir, job.file);
  if (!existsSync(htmlPath)) {
    console.error(`Missing template: ${htmlPath}`);
    process.exit(1);
  }
  const outPath = join(outDir, job.out);
  const url = pathToFileURL(resolve(htmlPath)).href;

  // Shoot at 2× then downscale — keeps mild 3D transforms sharp at CWS size.
  const scale = 2;
  console.log(`Rendering ${job.file} → ${job.out} (${job.w}×${job.h} @${scale}x)`);
  run(CHROME, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    `--force-device-scale-factor=${scale}`,
    `--window-size=${job.w},${job.h}`,
    `--screenshot=${outPath}`,
    url,
  ]);

  let info = sipsInfo(outPath);
  if (info.width !== job.w || info.height !== job.h) {
    console.log(`  resizing ${info.width}×${info.height} → ${job.w}×${job.h}`);
    run('sips', ['-z', String(job.h), String(job.w), outPath]);
    info = sipsInfo(outPath);
  }

  if (info.hasAlpha) {
    const jpegPath = outPath.replace(/\.png$/i, '.jpg');
    console.log(`  alpha present → writing ${jpegPath} (JPEG q95, no alpha)`);
    flattenAlpha(outPath, jpegPath);
    const jInfo = sipsInfo(jpegPath);
    console.log(`  OK ${jInfo.width}×${jInfo.height} alpha=${jInfo.hasAlpha}`);
  } else {
    console.log(`  OK ${info.width}×${info.height} alpha=${info.hasAlpha}`);
  }
}

console.log('\nDone. Outputs in promo/out/');
