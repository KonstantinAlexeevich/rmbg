# 05. Модель данных и хранение

## Где что лежит

- IndexedDB — тяжёлые бинарные данные: оригиналы, маски, результаты. База одна,
  `rmbg`, версия схемы отслеживается через `onupgradeneeded`. Origin = origin
  **web-студии** (не `chrome-extension://`).
- Cache Storage (`caches.open('rmbg-models')`) — байты весов модели. Делит квоту origin
  с IndexedDB.
- Настройки (presets, meta `modelAssets`, locale…) — через `src/platform/storage.ts`:
  - web: `localStorage` с префиксом `rmbg:`;
  - extension target (about / legacy paths): `chrome.storage.local`.
  API в core — `loadSettings` / `saveSettings` без прямого вызова chrome.
- Память вкладки — состояние UI и миниатюры. Ничего, что нельзя восстановить.

## Типы

```ts
type ItemStatus =
  | 'queued'      // принят, ждёт сегментации
  | 'segmenting'  // модель работает
  | 'composing'   // применяются фон и пресет
  | 'done'
  | 'failed';

type ItemRecord = {
  id: string;                 // crypto.randomUUID()
  sessionId: string;
  name: string;               // имя файла: исходное, пока не переименовали в карточке
  mimeType: string;
  createdAt: number;
  status: ItemStatus;
  error: string;              // пустая строка, если ошибки нет
  selected: boolean;
  source: { blob: Blob; width: number; height: number };
  thumbnail: Blob;            // длинная сторона 256 px, единственное в памяти грида
  mask: MaskRecord | null;    // null = сегментация ещё не выполнена
  result: ResultRecord | null;// null = композиция ещё не выполнена
  // слепки настроек пресета + края по presetId; пустой массив = переопределений нет
  overrides: ItemOverride[];
};

// Слепок для одной картинки в одном пресете (см. src/core/preset/override.ts).
// output и name остаются пресетными — формат в папке архива предсказуем.
type ItemOverride = {
  presetId: string;
  sizeMode: 'original' | 'fixed';
  canvas: { width: number; height: number };
  fit: Preset['fit'];
  anchor: 'center' | 'top' | 'bottom';
  background: Background;
  edge: EdgeSettings;
};

type Rect = { x: number; y: number; width: number; height: number };

type MaskRecord = {
  // PNG в оттенках серого, в родном разрешении прохода (не в разрешении оригинала)
  blob: Blob;
  // какую часть оригинала покрывает маска, в нормализованных координатах 0..1:
  // весь кадр для одного прохода, вырезка вокруг объекта для двух
  coverage: Rect;
  // bbox субъекта в нормализованных координатах оригинала,
  // пересчитанный по уточнённой маске, если второй проход был
  bbox: Rect;
  empty: boolean;             // модель ничего не нашла
  backend: 'webgpu' | 'wasm';
  passes: 1 | 2;
  durationMs: number;
};

type ResultRecord = {
  blob: Blob;
  thumbnail: Blob;
  width: number;
  height: number;
  format: 'png' | 'jpeg' | 'webp';
  // хэш эффективных настроек (пресет ⊕ edge ⊕ слепок); несовпадение = stale
  settingsHash: string;
};

type SessionRecord = {
  id: string;
  createdAt: number;
  updatedAt: number;
  presetId: string;
};
```

Про `null` в `mask` и `result`: это единственные два места, где отсутствие значения —
осмысленное состояние домена («ещё не посчитано»), и оно однозначно. Везде остальное
используем пустые значения вместо `null`: `error: ''`, пустой массив, а не `undefined`.

`overrides` — слепки для пары «изображение + экспорт (`Preset`)». Кнопка
Customize this image / «Только для этого изображения» копирует текущие значения
экспорта и края в слепок; дальше они живут отдельно и на правки глобального
экспорта/края не реагируют. Поля `output` (формат файла) и `name` остаются у
экспорта. При композиции и сборке ZIP эффективная пара считается через
`resolveComposition(preset, edge, overrides)`: при наличии слепка для `preset.id` поля
layout/background/edge берутся из него, иначе — из настроек. Хэш результата
(`settingsHash`) считается по эффективной паре, поэтому stale работает поэлементно:
изображение со слепком не становится устаревшим при правке глобального экспорта.

При удалении экспорта слепки с его `presetId` вычищаются у всех элементов сессии.
Слепки хранятся в IndexedDB вместе с элементом и переживают перезагрузку вкладки.

## Схема IndexedDB

Версия схемы: **2**.

- `sessions`: keyPath `id`.
- `items`: keyPath `id`, индекс `by-session` по `sessionId`, индекс `by-status` по `status`.

Миграция v1 → v2: у существующих элементов дописывается `overrides: []`.

Blob кладём прямо в записи: Chrome хранит их на диске отдельно от структуры записи, лишнего
копирования при чтении соседних полей не происходит.

Читая грид, берём записи по индексу `by-session`, но не тянем блобы в память: миниатюры
генерируются один раз при приёме файла и хранятся отдельным полем малого размера
(`thumbnail: Blob`, длинная сторона 256 px).

## Жизненный цикл сессии

- При открытии студии ищем последнюю сессию и восстанавливаем её.
- Кнопка Clear / «Очистить» создаёт новую сессию и удаляет предыдущую вместе с элементами.
- При запуске проверяем `navigator.storage.estimate()`; если занято больше 80% квоты,
  предупреждаем и предлагаем очистить старую сессию.
- Явной кнопкой Erase all data / «Стереть все данные» удаляем базу целиком.

Персистентность: запрашиваем `navigator.storage.persist()` один раз до скачивания весов
модели. Без этого Chrome под давлением диска вычистит Cache Storage, и пользователь снова
качает 176 МБ. Отказ не блокирует работу, но в UI предупреждаем, что модель может
потребовать повторной загрузки.

## Ассет модели

Байты лежат в Cache Storage; в настройках (platform storage) — только метаданные:

```ts
type ModelAsset = {
  variant: 'fp32' | 'q8';
  url: string;          // пин на конкретный коммит Hugging Face
  sha256: string;
  sizeBytes: number;
  downloadedAt: number;
};
```

Ключ кэша совпадает с `url`. При попадании в кэш метаданные подтверждают, что хэш уже
проверен; повторный digest не делаем. Если байты в кэше есть, а метаданных нет (или
наоборот — кэш вытеснен) — считаем промахом и качаем заново.

## Настройки (platform storage)

Хранилище см. выше: web → `localStorage`, extension → `chrome.storage.local`. Схема:

```ts
type Settings = {
  version: 1;
  presets: Preset[];
  activePresetId: string;
  exportPresetIds: string[]; // экспорты (Preset), по которым собирается ZIP
  edge: { threshold: number; erode: number; feather: number };
  ui: { locale: 'ru' | 'en' };
  backendOverride: 'auto' | 'webgpu' | 'wasm';  // для диагностики
  modelAssets: ModelAsset[]; // скачанные варианты; пустой массив = ещё ничего нет
};
```

`version` есть с первого дня: миграции настроек неизбежны, а угадывать формат задним
числом дорого.

## Хэш настроек

`settingsHash` считается от той части настроек, которая влияет на пиксели результата:
поля пресета без `id`/`name` плюс блок `edge`. Локаль, тема и порядок карточек в него
не входят. Для каждой картинки в хэш попадает **эффективная** пара после
`resolveComposition` (глобальный пресет/край либо слепок).

Сериализуем в стабильном порядке ключей и берём короткий хэш (djb2, крипто здесь
не нужно). Несовпадение хэша с текущим — признак, что результат устарел и требует
перекомпозиции.
