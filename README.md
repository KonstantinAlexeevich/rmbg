# rmbg (PNG Maker)

Удаление фона с изображений **локально в браузере**: ISNet через `onnxruntime-web`,
WebGPU как основной путь и WASM как фолбэк.

Два артефакта из одного репозитория:

| Артефакт | Команда | Выход |
| --- | --- | --- |
| **Web-студия** | `npm run build:web` | `dist-web/` — React UI, workers, ORT |
| **Chrome-расширение** | `npm run build` | `dist/` — SW, studio-bridge, about, icons |

Расширение тонкое: открывает URL студии, контекстное меню, мост jobs.
Обработка и скачивание — на origin web-студии.

Спецификация — в [docs/](docs/README.md). Сборка подробно — [docs/07-build.md](docs/07-build.md).

## Установка для разработки

Нужны **оба** процесса: web-студия и пакет расширения.

```bash
npm install

# Терминал A — студия (HMR)
npm run dev:web
# → http://localhost:5173/

# Терминал B — расширение
npm run build
# или watch: npm run dev
```

1. `chrome://extensions` → режим разработчика → «Загрузить распакованное» → **`dist/`**
2. Клик по иконке → вкладка студии на localhost
3. Первый запуск скачает `.onnx` с Hugging Face (нужен интернет)

Опционально: `npm run models` — сверить хэши зеркал HF без запуска UI.

Если порт 5173 занят: `lsof -ti :5173 | xargs kill`.

## URL студии (`VITE_STUDIO_WEB_URL`)

На билде расширения один env задаёт и `STUDIO_WEB_URL` в коде, и
`host_permissions` / `content_scripts.matches` в `dist/manifest.json`.
`public/manifest.json` руками под прод не править.

| Сценарий | Как |
| --- | --- |
| Локально | `npm run build` / `npm run dev` — default `http://localhost:5173/` |
| Preview web на 4173 | `VITE_STUDIO_WEB_URL=http://localhost:4173/ npm run build` |
| Chrome Web Store | см. ниже |

В логе сборки: `[rmbg] extension build: studio → …`.

## Сборка web-студии

```bash
npm run build:web    # → dist-web/ (+ ORT в dist-web/ort/)
npm run preview:web  # локальный preview (порт 4173)
```

На хостинге нужны заголовки **COOP / COEP** (как в Vite `server`/`preview`).

## Сборка расширения и ZIP для стора

```bash
# Локальный unpacked / отладка
npm run build
npm run package          # dist/ → rmbg.zip (studio = localhost)

# Прод (CWS)
cp .env.store.example .env.store
# прописать: VITE_STUDIO_WEB_URL=https://your-studio.example.com/
npm run package:store    # читает .env.store (mode store)

# Или разово без файла:
VITE_STUDIO_WEB_URL=https://your-studio.example.com/ npm run package
```

Перед подачей в стор: задеплоить `dist-web` на тот же origin, что в
`VITE_STUDIO_WEB_URL`.

## Скрипты

| Script | Назначение |
| --- | --- |
| `dev:web` | Vite dev server студии (5173) |
| `build:web` | production → `dist-web/` |
| `preview:web` | preview `dist-web` (4173) |
| `dev` | watch-сборка расширения → `dist/` |
| `build` | типы + extension (localhost studio) |
| `build:store` | extension с `.env.store` |
| `package` / `package:store` | ZIP для CWS |
| `models` | сверка SHA-256 зеркал HF |
| `typecheck` / `lint` / `format` | качество кода |

## Структура

```
docs/                       спецификация
public/manifest.json        шаблон MV3 (origin студии подставляет билд)
scripts/                    утилиты сборки (ORT, models, studio-url)
src/
  platform/                 env, studio-url, storage, download
  background/               service worker, ПКМ, extract, delivery
  content/                  studio-bridge (только origin студии)
  studio/                   React-студия (web)
  core/                     инференс, изображение, storage, ZIP
  workers/                  сегментация (ORT), экспорт
```
