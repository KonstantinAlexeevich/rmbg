import type { Background, Preset } from './preset/types';

export type Backend = 'webgpu' | 'wasm';

export type ModelVariant = 'fp32' | 'q8';

export type Rect = { x: number; y: number; width: number; height: number };

export type ItemStatus =
  | 'queued' // принят, ждёт сегментации
  | 'segmenting' // модель работает
  | 'composing' // применяются фон и пресет
  | 'done'
  | 'failed';

// настройки уточнения края маски, применяются к развёрнутой маске перед cutout
export type EdgeSettings = {
  threshold: number; // 0..1, ниже порога альфа обнуляется
  erode: number; // пиксели, поджатие маски внутрь
  feather: number; // пиксели, размытие кромки
};

// Слепок настроек для одной картинки в одном пресете.
// output и name остаются пресетными — формат в папке архива предсказуем.
export type ItemOverride = {
  presetId: string;
  sizeMode: Preset['sizeMode'];
  canvas: Preset['canvas'];
  fit: Preset['fit'];
  anchor: Preset['anchor'];
  background: Background;
  edge: EdgeSettings;
};

export type MaskRecord = {
  // PNG в оттенках серого, в родном разрешении прохода (не в разрешении оригинала)
  blob: Blob;
  // какую часть оригинала покрывает маска, в нормализованных координатах 0..1:
  // весь кадр для одного прохода, вырезка вокруг объекта для двух
  coverage: Rect;
  // bbox субъекта в нормализованных координатах оригинала,
  // пересчитанный по уточнённой маске, если второй проход был
  bbox: Rect;
  // модель ничего не нашла: bbox равен всему кадру, карточке — предупреждение
  empty: boolean;
  backend: Backend;
  passes: 1 | 2;
  durationMs: number;
};

export type ResultRecord = {
  blob: Blob;
  thumbnail: Blob;
  width: number;
  height: number;
  format: 'png' | 'jpeg' | 'webp';
  // хэш настроек, по которым посчитан результат; несовпадение с текущими = stale
  settingsHash: string;
};

export type ItemRecord = {
  id: string; // crypto.randomUUID()
  sessionId: string;
  name: string; // исходное имя файла
  mimeType: string;
  createdAt: number;
  status: ItemStatus;
  error: string; // пустая строка, если ошибки нет
  selected: boolean;
  source: { blob: Blob; width: number; height: number };
  thumbnail: Blob; // длинная сторона 512 px, единственное, что живёт в памяти грида
  mask: MaskRecord | null; // null = сегментация ещё не выполнена
  result: ResultRecord | null; // null = композиция ещё не выполнена
  // слепки настроек по presetId; пустой массив = переопределений нет
  overrides: ItemOverride[];
};

export type SessionRecord = {
  id: string;
  createdAt: number;
  updatedAt: number;
  presetId: string;
};

export type ModelAsset = {
  variant: ModelVariant;
  url: string; // пин на конкретный коммит Hugging Face
  sha256: string;
  sizeBytes: number;
  downloadedAt: number;
};
