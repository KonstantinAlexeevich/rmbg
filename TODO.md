- Переводы
  - Приложение
  - Расширение
- Зеркала для моделей
- Сохранение чанков при скачивании моделей !?
- Проверить about
- Выбор папки для а не конкретных файлов
- Лэндинг
- Сео на сайте
- Домен
- Мониторинг?

## Тесты (план)

Стек: **Vitest + happy-dom** (unit/integration), **Playwright** (product e2e).
Скрипты: `npm test`, `test:watch`, `test:coverage`, `test:e2e` (модели из `e2e/fixtures/`, один раз: `e2e:fetch-models`).

### Приоритет 1–3 — сделано
- Pure/core: layout, overrides, settings, ISNet, ZIP, mask, canvas pipeline, manifest, i18n, platform
- GPU DI, jobs/studio-origin mocks, shared studio-url normalize
- Orchestrator selectors + `processAll` / silent-export с мок-воркерами
- IDB (`fake-indexeddb`), model-cache, model-loader (fetch/SHA/abort)
- delivery / extract-image / download ветки; ext-bridge buffering

### Приоритет 4 — сделано (релизный слой)
- Playwright studio smoke + extension bridge (Add / Save) via `--load-extension`
- Модели **только** из `e2e/fixtures/` (route fulfill); один раз: `npm run e2e:fetch-models`

### Релизный гейт
```bash
npm run typecheck && npm run lint && npm test && npm run test:e2e
```

### Явно отложено (и почему)
- **Клик по системному ПКМ Chrome** — Playwright не жмёт native menu; тестируем enqueue→deliver→студию
- **Unit `segmentation.worker` / `session.ts` с ORT** — smoke e2e гоняет реальный WASM+q8
- **React component snapshots** — мало ROI
