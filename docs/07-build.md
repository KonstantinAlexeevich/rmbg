# 07. Стек, структура и сборка

## Стек

- TypeScript, strict.
- Vite — сборка, multi-entry (страница студии, service worker, воркеры).
- React + Tailwind CSS — интерфейс.
- Zustand — состояние студии (простой стор без бойлерплейта, легко читается из воркер-колбэков).
- `onnxruntime-web` 1.27.x — инференс.
- `idb` — тонкая обёртка над IndexedDB с промисами.
- `fflate` — ZIP.

Плагины Vite для расширений (CRXJS и подобные) не берём: они дают HMR, но добавляют
непредсказуемость в обработке манифеста и больших статических ассетов. Манифест держим
статическим файлом, копирование ассетов делаем явным шагом.

## Структура репозитория

```
rmbg/
  docs/                       спецификация
  public/
    manifest.json             копируется в dist как есть
    icons/
  scripts/
    fetch-models.mjs          dev-утилита: сверка SHA-256 зеркал HF
    copy-ort-assets.mjs       копирование .wasm/.mjs из node_modules
  src/
    background/
      service-worker.ts
    studio/
      index.html
      main.tsx
      App.tsx
      components/
      state/
    legal/
      about.html              экран «О расширении»
      AboutPage.tsx
      licenseEntries.ts
    core/
      inference/
        backend.ts            детект и выбор EP
        session.ts            создание и прогрев сессии
        isnet.ts              препроцесс и постпроцесс
        model-loader.ts       скачивание, хэш, Cache Storage
      image/
        decode.ts
        mask.ts               порог, erode, feather, bbox
        compose.ts            cutout, фон, размещение; compare «До»
        encode.ts
      preset/
        types.ts
        layout.ts             расчёт масштаба и позиции
        override.ts           слепки ItemOverride, resolveComposition
      storage/
        db.ts                 IndexedDB
        settings.ts           chrome.storage.local
        model-cache.ts        Cache Storage весов
      zip/
        archive.ts
    workers/
      segmentation.worker.ts
      export.worker.ts
  vite.config.ts
```

## Особенности сборки

- Воркеры создаются как `new Worker(new URL('../workers/segmentation.worker.ts',
  import.meta.url), { type: 'module' })`. В конфиге обязательно `worker: { format: 'es' }`
  и запрет инлайна: воркер, встроенный в blob URL, не пройдёт CSP расширения.
- Никаких динамических `import()` с удалённых адресов и никаких `eval`. Отдельно проверяем,
  что в собранном бандле нет `new Function(` и `URL.createObjectURL(new Blob([...script]))`,
  созданных сборщиком, — это типовая причина отказа при публикации.
- Ассеты ORT (`ort-wasm-simd-threaded.jsep.wasm`, соответствующий `.mjs` и родственные)
  копируются в `dist/ort/`. Конкретный список файлов зависит от версии пакета и сверяется
  при первой сборке, поэтому копируем скриптом по маске, а не перечислением.
- Веса модели в `dist` не копируются: они скачиваются в рантайме (см. ниже).
- В dev-режиме Vite-сервер не используется как источник для расширения: собираем в `dist`
  и грузим распакованным. Watch-режим (`vite build --watch`) плюс кнопка перезагрузки
  расширения покрывают цикл разработки.

## Доставка весов

Файлы весов в пакет расширения не входят и в git не попадают. В рантайме расширение
скачивает нужный вариант с Hugging Face (пин на коммит) — см. [03-inference.md](03-inference.md)
и Р-16 в [08-decisions.md](08-decisions.md).

Основное зеркало: `SacredNoir/isnet-general-use-onnx`, коммит
`ff56cb825ee2637d4726f8a739fb7bf1bf4bea04`, лицензия Apache-2.0. Оба файла
(`isnet-general-use.onnx` и `isnet-general-use-q8.onnx`) с эталонными SHA-256:

- fp32: `4c56bbc21588459dda11efba5a4a8ee163969da109ae170fb1988c1c2ea4a90a`, 176 213 804 байта;
- q8: `feed6f32a5e707ca7e939576b2d891b23fb9eb4114749657a5efc64e8651e43a`, 44 436 071 байт.

Запасное зеркало для fp32: `x-Liola-x/isnet-general-use-onnx` (тот же хэш).

`scripts/fetch-models.mjs` остаётся как dev-утилита: скачивает оба файла, сверяет хэши
с эталонами, печатает результат. В `npm run build` и `postinstall` не входит — веса на
машине разработчика для сборки не нужны.

Лицензия модели (Apache-2.0) и ссылка на первоисточник (репозиторий DIS Синь Цюя и др.)
кладутся в `LICENSES.md` и упоминаются на экране «О расширении».

## Скрипты npm

- `dev` — `vite build --watch`
- `build` — типы + продакшен-сборка + копирование ассетов ORT
- `models` — dev-утилита: сверка хэшей зеркал HF
- `package` — сборка и упаковка `dist` в ZIP для Chrome Web Store
- `typecheck`, `lint`, `format`

## Установка для разработки

1. `npm install`
2. `npm run build`
3. `chrome://extensions` → включить режим разработчика → «Загрузить распакованное» →
   выбрать `dist`.
4. При первом открытии студии расширение само скачает нужный вариант весов (нужен интернет).

Опционально: `npm run models` — сверить хэши зеркал без запуска расширения.

## Публикация

- Пакет без весов — порядка 24 МБ (почти всё — `ort-wasm-simd-threaded.asyncify.wasm`;
  JS/CSS — сотни КБ). Лимит Chrome Web Store — 2 ГБ, запас огромный; долгая проверка
  из-за размера не актуальна.
- Тексты для дашборда (single purpose, remote code, permissions, notes to reviewer) и
  чеклист аудита бандла — в [cws/submission.md](cws/submission.md).
- В описании и в поле обоснования разрешений явно указываем: исполняемый код (JS, WASM)
  целиком в пакете; единственный сетевой запрос — разовая загрузка файла данных модели
  (`.onnx`) с фиксированного адреса Hugging Face с проверкой SHA-256; пользовательские
  изображения никуда не передаются; разрешения минимальны (`storage`, `downloads`).
- Политика конфиденциальности: [cws/privacy.md](cws/privacy.md) (в дашборде — URL на
  этот файл в публичном репозитории).
