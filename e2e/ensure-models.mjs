#!/usr/bin/env node
/**
 * Verify local ONNX fixtures for e2e (no network).
 * Looks in e2e/fixtures/, then tries to extract from local Chromium Cache Storage.
 * To download once into fixtures: npm run e2e:fetch-models
 */
import { createHash } from 'node:crypto';
import { access, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'e2e', 'fixtures');

const MODELS = [
  {
    file: 'isnet-general-use-q8.onnx',
    sha256: 'feed6f32a5e707ca7e939576b2d891b23fb9eb4114749657a5efc64e8651e43a',
    sizeBytes: 44_436_071,
    required: true,
  },
  {
    file: 'isnet-general-use.onnx',
    sha256: '4c56bbc21588459dda11efba5a4a8ee163969da109ae170fb1988c1c2ea4a90a',
    sizeBytes: 176_213_804,
    // Required for fp32 / WebGPU e2e (studio-fp32, extension-fp32).
    required: true,
  },
];

const CACHE_ROOTS = [
  join(root, 'e2e/.pw-profile/Default/Service Worker/CacheStorage'),
  join(root, 'e2e/.pw-profile/Default/Cache/Cache_Data'),
];

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

async function validFile(path, model) {
  if (!(await exists(path))) return false;
  const bytes = await readFile(path);
  return bytes.byteLength === model.sizeBytes && sha256(bytes) === model.sha256;
}

async function walkFiles(dir, out = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walkFiles(path, out);
    else out.push(path);
  }
  return out;
}

async function tryExtract(model) {
  const outFile = join(outDir, model.file);
  for (const rootDir of CACHE_ROOTS) {
    if (!(await exists(rootDir))) continue;
    const files = await walkFiles(rootDir);
    for (const path of files) {
      let st;
      try {
        st = await stat(path);
      } catch {
        continue;
      }
      if (st.size < model.sizeBytes || st.size > model.sizeBytes + 2048) continue;
      const buf = await readFile(path);
      const maxOff = Math.min(400, buf.length - model.sizeBytes);
      for (let off = 0; off <= maxOff; off++) {
        const slice = buf.subarray(off, off + model.sizeBytes);
        if (sha256(slice) === model.sha256) {
          await mkdir(outDir, { recursive: true });
          await writeFile(outFile, slice);
          console.log(`extracted ${model.file} ← ${path}`);
          return true;
        }
      }
    }
  }
  return false;
}

let failed = false;
for (const model of MODELS) {
  const path = join(outDir, model.file);
  if (await validFile(path, model)) {
    console.log(`OK ${model.file}`);
    continue;
  }
  if (await tryExtract(model)) {
    console.log(`OK ${model.file}`);
    continue;
  }
  if (model.required) {
    failed = true;
    console.error(
      `Missing required fixture: ${path}\n` +
        `Place the file there (SHA-256 ${model.sha256}) or run: npm run e2e:fetch-models`,
    );
  } else {
    console.warn(`Optional fixture missing: ${model.file}`);
  }
}

process.exit(failed ? 1 : 0);
