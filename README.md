# rmbg

Chrome-расширение (Manifest V3), которое удаляет фон с изображений локально в
браузере: ISNet через `onnxruntime-web`, WebGPU как основной путь и WASM как
фолбэк. Пользовательские изображения никуда не отправляются; единственный
сетевой запрос — разовая загрузка файла весов модели с Hugging Face с
проверкой SHA-256.

Спецификация — в [docs/](docs/README.md).

## Установка для разработки

1. `npm install`
2. `npm run build`
3. `chrome://extensions` → включить режим разработчика → «Загрузить
   распакованное» → выбрать `dist`.
4. При первом открытии студии расширение само скачает нужный вариант весов
   (нужен интернет).

Опционально: `npm run models` — сверить хэши зеркал Hugging Face без запуска
расширения.

## Скрипты

- `npm run dev` — сборка в watch-режиме (`vite build --watch`); расширение
  загружается распакованным из `dist`, после изменения — кнопка перезагрузки
  на `chrome://extensions`
- `npm run build` — типы + продакшен-сборка + копирование ассетов ORT
- `npm run models` — dev-утилита: сверка SHA-256 зеркал Hugging Face
- `npm run package` — сборка и упаковка `dist` в ZIP для Chrome Web Store
- `npm run typecheck`, `npm run lint`, `npm run format`

## Структура

```
docs/                       спецификация
public/manifest.json        манифест MV3, копируется в dist как есть
scripts/                    dev-утилиты сборки
src/
  background/               service worker: открыть вкладку студии
  studio/                   React-приложение студии
  core/                     инференс, обработка изображений, хранение, ZIP
  workers/                  воркер сегментации (ORT) и воркер экспорта
```
