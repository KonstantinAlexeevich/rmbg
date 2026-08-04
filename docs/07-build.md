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
  public/
    manifest.json             → dist/ (extension)
    icons/                    → dist/ и dist-web/
  scripts/
    fetch-models.mjs
    copy-ort-assets.mjs       arg: dist | dist-web
  src/
    platform/                 env, assets, storage, download, studio-url, base64
    background/
      service-worker.ts       opens studio, context menus, jobs
      context-menu.ts
      jobs.ts
    content/
      studio-bridge.ts        CS on studio origin only
      bridge-protocol.ts
    studio/                   React studio (web entry)
      ext-bridge.ts           page side of CS bridge
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

- Entries: `src/studio/index.html`, `src/legal/about.html` → плоские `index.html` / `about.html`.
- `define`: `VITE_APP_TARGET=web`, `VITE_APP_VERSION` из `package.json`.
- Headers COOP + COEP на `server` и `preview`.
- Dev: middleware `/ort/*` из `node_modules/onnxruntime-web/dist`; pretty routes `/` → studio, `/about.html` → about.
- `public/manifest.json` из `dist-web` удаляется post-build (нужен только расширению).
- Workers: `worker.format: 'es'`.

### Extension (`vite.config.ts`)

| Script | Назначение |
| --- | --- |
| `dev` | `vite build --watch` → `dist/` |
| `build` | `tsc` + vite build (без ORT copy — студии/ORT в пакете нет) |
| `package` | zip `dist/` → `rmbg.zip` |

- Entries: service-worker, studio-bridge, about.
- `define`: `VITE_APP_TARGET=extension`.
- Пакет: `service-worker.js`, `studio-bridge.js`, `about.html`, assets about, icons, manifest. **Без** React-студии и `ort/`.

## Особенности

- Workers: `new Worker(new URL('…', import.meta.url), { type: 'module' })`.
- `assetUrl('ort/')` на web — **absolute** URL (`http://localhost:5173/ort/`), иначе dynamic import ORT в Vite dev ломается.
- На web `ort.env.wasm.numThreads = 1` (см. [02-architecture.md](02-architecture.md), [08-decisions.md](08-decisions.md) Р-27).
- Post-build для web: `scripts/copy-ort-assets.mjs dist-web` — копирует referenced `.wasm`/`.mjs`, чистит дубликаты, предупреждает о `new Function(` / blob patterns (CWS-risks; на web не блокируют publish extension).
- Веса `.onnx` не в git и не в dist: runtime HF fetch.

## Доставка весов

Без изменений по URL/SHA: [03-inference.md](03-inference.md), Р-16. Зеркала и хэши — как в `model-manifest.ts` / `fetch-models.mjs`.

## Скрипты npm

- `dev` / `build` / `package` — extension
- `dev:web` / `build:web` / `preview:web` — studio site
- `models`, `typecheck`, `lint`, `format`

## Установка для разработки

Нужны **оба** процесса:

1. `npm install`
2. Терминал A: `npm run dev:web` → http://localhost:5173/
3. Терминал B: `npm run build` (или `npm run dev` для watch)
4. `chrome://extensions` → Load unpacked → **`dist/`**
5. Клик по иконке → вкладка студии на localhost. Первый раз — скачивание `.onnx`.

Если порт 5173 занят — остановить прежний `dev:web` (`lsof -ti :5173 | xargs kill`).

Preview web (`preview:web` на 4173) SW **по умолчанию не открывает**: поменять
`STUDIO_WEB_URL` и пересобрать extension.

## Публикация (состояние после split)

- Extension ZIP сейчас **тонкий** (без ORT ~24 МБ эпохи «всё в пакете»). CWS-тексты в
  [cws/](cws/) требуют обновления перед подачей.
- Web-студию деплоить отдельно (`dist-web`) с COOP/COEP на edge.
- Лицензии: `LICENSES.md`, about page.
