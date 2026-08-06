#!/usr/bin/env node
/**
 * One-time download of ONNX fixtures into e2e/fixtures/.
 * Not used by npm test / test:e2e — tests only read local files.
 */
import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { access, mkdir, readFile, rename } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const COMMIT = 'ff56cb825ee2637d4726f8a739fb7bf1bf4bea04';
const outDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

const MODELS = [
  {
    file: 'isnet-general-use-q8.onnx',
    sha256: 'feed6f32a5e707ca7e939576b2d891b23fb9eb4114749657a5efc64e8651e43a',
    sizeBytes: 44_436_071,
    url: `https://huggingface.co/SacredNoir/isnet-general-use-onnx/resolve/${COMMIT}/isnet-general-use-q8.onnx`,
  },
  {
    file: 'isnet-general-use.onnx',
    sha256: '4c56bbc21588459dda11efba5a4a8ee163969da109ae170fb1988c1c2ea4a90a',
    sizeBytes: 176_213_804,
    url: `https://huggingface.co/SacredNoir/isnet-general-use-onnx/resolve/${COMMIT}/isnet-general-use.onnx`,
  },
];

async function ok(path, model) {
  try {
    await access(path);
  } catch {
    return false;
  }
  const bytes = await readFile(path);
  const digest = createHash('sha256').update(bytes).digest('hex');
  return bytes.byteLength === model.sizeBytes && digest === model.sha256;
}

await mkdir(outDir, { recursive: true });
let failed = false;

for (const model of MODELS) {
  const path = join(outDir, model.file);
  if (await ok(path, model)) {
    console.log(`already OK: ${model.file}`);
    continue;
  }
  process.stdout.write(`download ${model.file}… `);
  try {
    const res = await fetch(model.url, { signal: AbortSignal.timeout(1_800_000) });
    if (!res.ok || res.body === null) throw new Error(`HTTP ${res.status}`);
    const tmp = `${path}.tmp`;
    await pipeline(Readable.fromWeb(res.body), createWriteStream(tmp));
    const bytes = await readFile(tmp);
    const digest = createHash('sha256').update(bytes).digest('hex');
    if (bytes.byteLength !== model.sizeBytes || digest !== model.sha256) {
      throw new Error(`checksum mismatch size=${bytes.byteLength} sha=${digest}`);
    }
    await rename(tmp, path);
    console.log('OK');
  } catch (e) {
    failed = true;
    console.log(e instanceof Error ? e.message : String(e));
  }
}

process.exit(failed ? 1 : 0);
