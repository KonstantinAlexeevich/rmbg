# Спецификация: rmbg — удаление фона (web-студия + Chrome-расширение)

Продукт удаляет фон с изображений **локально в браузере**: ISNet через `onnxruntime-web`,
WebGPU как основной путь и WASM как фолбэк. Пользовательские изображения никуда не
отправляются; единственный сетевой запрос студии — разовая загрузка файла весов модели
с фиксированного адреса.

**Текущая схема поставки (этап разработки):** студия — отдельное web-приложение
(`localhost` / позже прод-домен). Chrome-расширение (MV3) тонкое: service worker открывает
URL студии; в пакете остаются иконки, SW и страница About. Общий код (`core`, `studio`,
`workers`) лежит в одном репозитории, две цели сборки — без monorepo-пакетов.

## Состав документов

- [01-product.md](01-product.md) — цели, сценарии использования, объём v1 и не-цели
- [02-architecture.md](02-architecture.md) — web + extension, потоки данных, манифест, CSP и cross-origin isolation
- [03-inference.md](03-inference.md) — модель ISNet, загрузка весов, EP, препроцесс/постпроцесс, фолбэк
- [04-pipeline.md](04-pipeline.md) — конвейер обработки, композиция, экспорт (Preset), ZIP
- [05-data-model.md](05-data-model.md) — типы данных, IndexedDB, кэш модели, настройки
- [06-ui.md](06-ui.md) — экраны студии, состояния, тексты
- [07-build.md](07-build.md) — стек, две сборки (web / extension), скрипты, dev-цикл
- [08-decisions.md](08-decisions.md) — журнал принятых решений и известные риски
- [09-glossary.md](09-glossary.md) — глоссарий терминов интерфейса (EN → RU)
- [cws/](cws/) — материалы Chrome Web Store (permissions / privacy / remote code сверены с
  архитектурой; перед подачей — URL политики, listing, prod origin)

## Статус

Спецификация отражает split **web-студия + thin extension** (2026-08): platform-слой,
`npm run dev:web` / `build:web`, SW открывает `http://localhost:5173/studio`, ORT и React-студия
не входят в пакет расширения. UI студии (экспорты, overrides, «до/после», нижняя панель
и т.д.) без изменения продуктовой модели — см. [09-glossary.md](09-glossary.md).

Модель permissions зафиксирована ([02-architecture.md](02-architecture.md),
[cws/submission.md](cws/submission.md)): обязательный host только на origin студии;
optional `http(s)://*/*` — пул для точечного grant при ПКМ. Origin студии на билде —
`VITE_STUDIO_WEB_URL` (default `…/studio`; стор: `.env.store` / `package:store`). Перед
подачей — URL политики и listing (`description.md`).

## Инварианты, которые не нарушаем

1. Ни один байт пользовательских изображений не покидает устройство. Единственный сетевой
   запрос студии за сессию жизни весов — разовая загрузка `.onnx` с зафиксированного адреса
   (пин на коммит Hugging Face) с проверкой SHA-256. После неё обработка полностью офлайн.
2. Исполняемый runtime инференса (JS/WASM ONNX Runtime) **не качается с CDN как remotely
   hosted code на origin студии**: в web-сборке ORT копируется в `dist-web/ort/` и отдаётся
   с того же origin; скрипты студии — артефакты той же деплой-сборки. В пакете расширения
   ORT больше не лежит (студия не extension page).
3. Content script только на origin студии (мост jobs / меню экспортов). Картинку с чужого
   сайта читаем после ПКМ: `data:` в SW; `blob:` — inject во вкладке клика; `http(s):` —
   optional host на origin CDN, затем `fetch` в SW. Studio origin в `host_permissions` и
   `content_scripts.matches` — вкладка студии и bridge (не весь интернет).
4. Два режима ПКМ: **Add** — фокус студии + обычная карточка; **Save without background** —
   без фокуса, ephemeral item, auto-download, удаление из сессии (см. Р-28).
5. Дорогая операция (сегментация) выполняется один раз на изображение; смена фона,
   экспорта, края или слепка пересчитывает только композицию.
