// Dev-утилита: скачивает оба варианта весов со всех зеркал Hugging Face
// и сверяет SHA-256 с эталонами. В сборку не входит; веса для сборки не нужны.
// Эталоны продублированы из src/core/inference/model-manifest.ts.
import { createHash } from 'node:crypto';

const COMMIT = 'ff56cb825ee2637d4726f8a739fb7bf1bf4bea04';

const VARIANTS = [
  {
    name: 'fp32 (isnet-general-use.onnx)',
    sha256: '4c56bbc21588459dda11efba5a4a8ee163969da109ae170fb1988c1c2ea4a90a',
    sizeBytes: 176_213_804,
    urls: [
      `https://huggingface.co/SacredNoir/isnet-general-use-onnx/resolve/${COMMIT}/isnet-general-use.onnx`,
      'https://huggingface.co/x-Liola-x/isnet-general-use-onnx/resolve/main/isnet-general-use.onnx',
    ],
  },
  {
    name: 'q8 (isnet-general-use-q8.onnx)',
    sha256: 'feed6f32a5e707ca7e939576b2d891b23fb9eb4114749657a5efc64e8651e43a',
    sizeBytes: 44_436_071,
    urls: [
      `https://huggingface.co/SacredNoir/isnet-general-use-onnx/resolve/${COMMIT}/isnet-general-use-q8.onnx`,
    ],
  },
];

let failed = false;

for (const variant of VARIANTS) {
  for (const url of variant.urls) {
    process.stdout.write(`${variant.name}\n  ${url}\n  скачивание... `);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      const digest = createHash('sha256').update(bytes).digest('hex');
      const sizeOk = bytes.byteLength === variant.sizeBytes;
      const hashOk = digest === variant.sha256;
      if (sizeOk && hashOk) {
        console.log(`OK (${bytes.byteLength} байт, хэш совпал)`);
      } else {
        failed = true;
        console.log(
          `ОШИБКА: размер ${bytes.byteLength} (ожидали ${variant.sizeBytes}), хэш ${digest}`,
        );
      }
    } catch (e) {
      failed = true;
      console.log(`ОШИБКА: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

process.exit(failed ? 1 : 0);
