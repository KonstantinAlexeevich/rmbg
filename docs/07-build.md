# 07. Стек, структура и сборка

## Стек

- TypeScript, strict.
- **Две цели Vite:** web-студия и Chrome-расширение (отдельные конфиги, один `package.json`).
- React + Tailwind CSS — UI студии.
- Zustand — стор студии.
- `onnxruntime-web` 1.27.x — инференс (только web-артефакт / origin студии).
- `idb`, `fflate`.

CRXJS и подобные не используем. Манифест статический в `public/`.

## Структура репозитория

```
rmbg/
  docs/
  locales/
    studio/
      en.json                 → bundled into web studio
      ru.json
  public/
    manifest.json             → dist/ (extension); name/description via __MSG_*__
    manifest.webmanifest      → dist-web/ (PWA install)
    sw.js                     → dist-web/ (studio shell service worker)
    _locales/{en,ru}/         → dist/_locales/ (Chrome i18n)
    icons/                    → dist/ и dist-web/ (в т.ч. 192/512 для PWA)
  scripts/
    fetch-models.mjs
    copy-ort-assets.mjs       arg: dist | dist-web
  src/
    platform/                 env, assets, storage, download, studio-url, base64
    shared/                   ext-protocol (SW ↔ CS ↔ page)
    background/
      service-worker.ts       opens studio, wires menus/delivery
      context-menu.ts
      delivery.ts             openStudioTab, deliver jobs
      extract-image.ts
      jobs.ts
      studio-origin.ts
    content/
      studio-bridge.ts        CS on studio origin only
    studio/                   React studio (web entry)
      ext-bridge.ts           page side of CS bridge
      ext-sync.ts
    legal/                    about (web + extension entries)
    core/
      inference/
      image/
      preset/
      storage/                settings via platform storage
      zip/
    workers/
  vite.config.ts              extension → dist/
  vite.config.web.ts          web → dist-web/
```

## Две сборки

### Web (`vite.config.web.ts`)

| Script | Назначение |
| --- | --- |
| `dev:web` | Vite dev server, port **5173**, HMR |
| `build:web` | production → `dist-web/` + `copy-ort-assets.mjs dist-web` |
| `preview:web` | preview port **4173** (не URL по умолчанию для SW) |

- Entries: `src/landing/index.html`, `src/studio/index.html`, `src/legal/about.html` →
  `index.html`, `studio/index.html`, `about/index.html`.
- `define`: `VITE_APP_TARGET=web`, `VITE_APP_VERSION` из `package.json`.
- Headers COOP + COEP на `server` и `preview`.
- Dev: middleware `/ort/*` из `node_modules/onnxruntime-web/dist`; pretty routes
  `/` → landing, `/studio` → studio, `/about/` → about.
- `public/manifest.json` из `dist-web` удаляется post-build (нужен только расширению).
- **PWA:** `public/manifest.webmanifest` (`start_url`/`scope` = `/studio`,
  `handle_links: not-preferred`) + `public/studio/sw.js` + иконки 192/512; регистрация SW
  только в `import.meta.env.PROD` (`src/studio/register-sw.ts`, script `/studio/sw.js`,
  scope `/studio`). About/лендинг вне scope — обычные вкладки браузера. Shell-кэш
  stamp’ится версией пакета (`__SW_CACHE_ID__` → `package.json` version). Веса `.onnx`
  SW не кэширует (отдельный Cache Storage в приложении).
- Workers: `worker.format: 'es'`.

### Extension (`vite.config.ts`)

| Script | Назначение |
| --- | --- |
| `dev` | `vite build --watch` → `dist/` (studio URL = default localhost) |
| `build` | `tsc` + vite build |
| `build:store` | то же с `--mode store` (читает `.env.store`) |
| `package` / `package:store` | zip `dist/` → `rmbg.zip` |

- Entries: service-worker, studio-bridge, about.
- `define`: `VITE_APP_TARGET=extension`, `VITE_APP_VERSION`, **`VITE_STUDIO_WEB_URL`**.
- URL студии: env `VITE_STUDIO_WEB_URL` (CLI / `.env` / `.env.[mode]`), иначе
  `http://localhost:5173/studio`. Нормализация в `scripts/studio-url.ts`. В лог сборки:
  `[rmbg] extension build: studio → …`.
- Плагин `inject-studio-origin` пишет тот же origin в `dist/manifest.json`
  (`host_permissions` + `content_scripts.matches`). `public/manifest.json` не править
  руками под прод.
- Content script `studio-bridge.js` после vite **пересобирается esbuild в один IIFE**
  (без `import` shared-чанков); те же `define`, что у Vite.
- Пакет: `service-worker.js`, `studio-bridge.js`, `about.html`, assets about, icons,
  manifest, `_locales/`. **Без** React-студии, `ort/`, `manifest.webmanifest`, `sw.js`.

## Особенности

- Workers: `new Worker(new URL('…', import.meta.url), { type: 'module' })`.
- `assetUrl('ort/')` на web — **absolute** URL (`http://localhost:5173/ort/`), иначе dynamic import ORT в Vite dev ломается.
- На web `ort.env.wasm.numThreads = 1` (см. [02-architecture.md](02-architecture.md), [08-decisions.md](08-decisions.md) Р-27).
- Post-build для web: `scripts/copy-ort-assets.mjs dist-web` — копирует referenced `.wasm`/`.mjs`, чистит дубликаты, предупреждает о `new Function(` / blob patterns (CWS-risks; на web не блокируют publish extension).
- Веса `.onnx` не в git и не в dist: runtime HF fetch.

## Доставка весов

Без изменений по URL/SHA: [03-inference.md](03-inference.md), Р-16. Зеркала и хэши — как в `model-manifest.ts` / `fetch-models.mjs`.

## Скрипты npm

- `dev` / `build` / `package` — extension (localhost studio)
- `build:store` / `package:store` — extension под прод URL (`.env.store`)
- `dev:web` / `build:web` / `preview:web` — studio site
- `models`, `typecheck`, `lint`, `format`
- `test` / `test:watch` / `test:coverage` — Vitest (unit + integration)
- `test:e2e` / `test:e2e:install` — Playwright studio smoke (см. ниже)

## Тесты

| Слой | Команда | Что гейтит |
| --- | --- | --- |
| Unit / integration | `npm test` | preset/settings/mask/ZIP/jobs/delivery/model-loader/IDB/orchestrator (мок-воркеры) |
| Coverage | `npm run test:coverage` | v8; UI/workers/SW wiring исключены из отчёта намеренно |
| Product e2e | `npm run test:e2e` | studio smoke + extension Add/Save (load unpacked `dist/`) |

Зависимости: native `canvas`, Chromium (`npm run test:e2e:install`).
ONNX в тестах **только локально** из `e2e/fixtures/` (без сети). Один раз положить веса:
`npm run e2e:fetch-models` (или скопировать файлы вручную). `test:e2e` сам качать не будет.

**Не гейтится автотестами:** клик по системному меню Chrome ПКМ; store listing — см. [cws/submission.md](cws/submission.md).

Релизный гейт:

```bash
npm run typecheck && npm run lint && npm test && npm run test:e2e
```


## Установка для разработки

Нужны **оба** процесса:

1. `npm install`
2. Терминал A: `npm run dev:web` → http://localhost:5173/ (лендинг), студия → `/studio`
3. Терминал B: `npm run build` (или `npm run dev` для watch)
4. `chrome://extensions` → Load unpacked → **`dist/`**
5. Клик по иконке → вкладка студии на `http://localhost:5173/studio`. Первый раз — скачивание `.onnx`.

Если порт 5173 занят — остановить прежний `dev:web` (`lsof -ti :5173 | xargs kill`).

Preview web (`preview:web` на 4173) для SW:

```bash
VITE_STUDIO_WEB_URL=http://localhost:4173/studio npm run build
```

(или временный `.env` / `.env.local` — в gitignore).

## Публикация (состояние после split)

- Extension ZIP **тонкий** (SW + studio-bridge CS + about + icons; без React/ORT).
- Перед CWS: задеплоить `dist-web` с COOP/COEP; для ZIP —
  `cp .env.store.example .env.store`, прописать прод URL, `npm run package:store`.
  Либо разово: `VITE_STUDIO_WEB_URL=https://… npm run package`.
- Обоснования permissions / remote code / privacy — [cws/submission.md](cws/submission.md),
  [cws/privacy.md](cws/privacy.md); listing (`description.md`) — маркетинг ПКМ.
- Лицензии: `LICENSES.md`, about page.
