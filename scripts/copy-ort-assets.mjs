// Пост-обработка dist после vite build:
// 1. Копирует в <dist>/ort/ ровно те рантайм-ассеты onnxruntime-web (.wasm/.mjs),
//    на которые ссылается собранный бандл (список зависит от версии пакета).
// 2. Удаляет из <dist>/assets дубликат .wasm, заинлайненный Vite: рантайм грузит
//    его из <dist>/ort/ по ort.env.wasm.wasmPaths.
// 3. Проверяет бандл на конструкции, из-за которых Chrome Web Store отклоняет
//    расширения (remotely hosted code через blob/eval) — для web только warning.
import { cp, mkdir, readdir, readFile, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const distName = process.argv[2] ?? 'dist';
const dist = resolve(import.meta.dirname, '..', distName);
const distAssets = join(dist, 'assets');
const ortDist = resolve(import.meta.dirname, '../node_modules/onnxruntime-web/dist');
const ortOut = join(dist, 'ort');
const isExtensionDist = distName === 'dist';

// --- какие файлы ORT нужны: смотрим по ссылкам в собранных бандлах ---
const available = new Set(await readdir(ortDist));
const referenced = new Set();
for (const file of await readdir(distAssets)) {
  if (!file.endsWith('.js')) continue;
  const source = await readFile(join(distAssets, file), 'utf8');
  for (const match of source.matchAll(/ort-wasm[\w.-]*\.(?:wasm|mjs)/g)) {
    // ссылки на заинлайненные Vite копии несут хэш-суффикс — срезаем
    const canonical = match[0].replace(/-[\w-]{8}\.(wasm|mjs)$/, '.$1');
    if (available.has(canonical)) referenced.add(canonical);
  }
}
// каждому .wasm нужен его .mjs-загрузчик и наоборот
for (const name of [...referenced]) {
  referenced.add(name.replace(/\.(wasm|mjs)$/, '.wasm'));
  referenced.add(name.replace(/\.(wasm|mjs)$/, '.mjs'));
}
if (referenced.size === 0) {
  console.error(`В бандле (${distName}) не найдено ссылок на ассеты ORT — проверьте сборку`);
  process.exit(1);
}

await mkdir(ortOut, { recursive: true });
for (const name of [...referenced].sort()) {
  await cp(join(ortDist, name), join(ortOut, name));
}
console.log(`Скопировано в ${distName}/ort: ${[...referenced].sort().join(', ')}`);

// --- дубликаты .wasm в dist/assets не нужны ---
for (const file of await readdir(distAssets)) {
  if (file.endsWith('.wasm')) {
    await rm(join(distAssets, file));
    console.log(`Удалён дубликат: ${distName}/assets/${file}`);
  }
}

// --- типовые причины отказа при публикации ---
// Известное исключение: `new Function(` в чанке воркера сегментации — это
// embind-глю внутри официального бандла onnxruntime-web (methodCaller);
// в нашем сценарии эти ветки не исполняются, а под CSP расширения они бы
// упали, а не выполнились. Ветка createObjectURL(new Blob(...)) в ORT
// активируется только для cross-origin-скриптов, чего в расширении нет.
const forbidden = [/new Function\(/, /createObjectURL\(new Blob\(\[/];
let found = false;
for (const file of await readdir(distAssets)) {
  if (!file.endsWith('.js')) continue;
  const source = await readFile(join(distAssets, file), 'utf8');
  for (const pattern of forbidden) {
    if (pattern.test(source)) {
      console.warn(
        `ВНИМАНИЕ: ${pattern} найден в ${distName}/assets/${file} — сверьте с известными исключениями выше`,
      );
      found = true;
    }
  }
}
if (!found) {
  console.log(`Проверка бандла (${distName}): запрещённых конструкций не найдено`);
} else if (!isExtensionDist) {
  console.log(`(web-сборка: предупреждения CWS не блокируют)`);
}
