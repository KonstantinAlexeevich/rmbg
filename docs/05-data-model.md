# 05. Модель данных и хранение

## Где что лежит

- IndexedDB — тяжёлые бинарные данные: оригиналы, маски, результаты. База одна,
  `rmbg`, версия схемы отслеживается через `onupgradeneeded`.
- Cache Storage (`caches.open('rmbg-models')`) — байты весов модели. Делит квоту origin
  с IndexedDB.
- `chrome.storage.local` — настройки, пресеты и метаданные скачанного ассета модели.
  Малый объём, удобно читать из любого контекста, переживает очистку данных сайта.
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
  name: string;               // исходное имя файла
  mimeType: string;
  createdAt: number;
  status: ItemStatus;
  error: string;              // пустая строка, если ошибки нет
  source: { blob: Blob; width: number; height: number };
  mask: MaskRecord | null;    // null = сегментация ещё не выполнена
  result: ResultRecord | null;// null = композиция ещё не выполнена
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
  backend: 'webgpu' | 'wasm';
  passes: 1 | 2;
  durationMs: number;
};

type ResultRecord = {
  blob: Blob;
  width: number;
  height: number;
  format: 'png' | 'jpeg' | 'webp';
  // хэш настроек, по которым посчитан результат; несовпадение с текущими = stale
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

## Схема IndexedDB

- `sessions`: keyPath `id`.
- `items`: keyPath `id`, индекс `by-session` по `sessionId`, индекс `by-status` по `status`.

Blob кладём прямо в записи: Chrome хранит их на диске отдельно от структуры записи, лишнего
копирования при чтении соседних полей не происходит.

Читая грид, берём записи по индексу `by-session`, но не тянем блобы в память: миниатюры
генерируются один раз при приёме файла и хранятся отдельным полем малого размера
(`thumbnail: Blob`, длинная сторона 256 px).

## Жизненный цикл сессии

- При открытии студии ищем последнюю сессию и восстанавливаем её.
- Кнопка «Новая сессия» создаёт новую и удаляет предыдущую вместе с элементами.
- При запуске проверяем `navigator.storage.estimate()`; если занято больше 80% квоты,
  предупреждаем и предлагаем очистить старую сессию.
- Явной кнопкой «Очистить всё» удаляем базу целиком.

Персистентность: запрашиваем `navigator.storage.persist()` один раз до скачивания весов
модели. Без этого Chrome под давлением диска вычистит Cache Storage, и пользователь снова
качает 176 МБ. Отказ не блокирует работу, но в UI предупреждаем, что модель может
потребовать повторной загрузки.

## Ассет модели

Байты лежат в Cache Storage; в `chrome.storage.local` — только метаданные:

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

## Настройки в chrome.storage.local

```ts
type Settings = {
  version: 1;
  presets: Preset[];
  activePresetId: string;
  exportPresetIds: string[]; // пресеты, по которым собирается ZIP
  edge: { threshold: number; erode: number; feather: number };
  ui: { locale: 'ru' | 'en'; theme: 'system' | 'light' | 'dark' };
  backendOverride: 'auto' | 'webgpu' | 'wasm';  // для диагностики
  modelAssets: ModelAsset[]; // скачанные варианты; пустой массив = ещё ничего нет
};
```

`version` есть с первого дня: миграции настроек неизбежны, а угадывать формат задним
числом дорого.

## Хэш настроек

`settingsHash` считается от той части настроек, которая влияет на пиксели результата:
поля пресета без `id`/`name` плюс блок `edge`. Локаль, тема и порядок карточек в него
не входят.
Сериализуем в стабильном порядке ключей и берём короткий хэш (djb2 или FNV-1a, крипто здесь
не нужно). Несовпадение хэша с текущим — признак, что результат устарел и требует
перекомпозиции.
