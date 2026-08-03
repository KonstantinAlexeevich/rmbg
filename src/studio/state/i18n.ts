// English is the source dictionary. Russian is a full translation keyed by the same keys.
// Components never hardcode UI copy — only MessageKey via t().

const en = {
  appName: 'PNG Maker',

  sessionClear: 'Clear',
  exportZip: 'Export ZIP',
  addImages: 'Add images',

  emptyTitle: 'Drop images here',
  emptyChooseFiles: 'Choose files',
  emptyPasteHint: 'or paste from the clipboard (Ctrl/Cmd + V)',
  emptyPrivacy:
    'After a one-time model download the extension works offline: images never leave your device.',

  modelDownloading: 'Downloading model: {loaded} of {total}',
  modelCancel: 'Cancel',
  modelFailed: 'Model download failed',
  modelRetry: 'Retry',
  modelEvicted: 'Model was removed from browser storage — download again',
  modelDownload: 'Download model',
  modelVerifying: 'Verifying model…',
  modelCreating: 'Initializing model…',

  statusQueued: 'Queued',
  statusSegmenting: 'Detecting subject…',
  statusComposing: 'Rendering…',
  statusDone: 'Ready',
  statusFailed: 'Failed',

  cardRetry: 'Retry',
  cardDelete: 'Delete',
  cardDownload: 'Download',
  cardOpenPreview: 'Open preview',
  cardRename: 'Rename',
  cardEmptyMask: 'No subject detected',
  cardOverride: 'Custom settings',
  cardSelect: 'Select {name}',

  edgeTitle: 'Edge refinement',
  edgeSharedNote: 'Shared by all exports',
  edgeThreshold: 'Threshold',
  edgeThresholdHint: 'Alpha below this value becomes fully transparent',
  edgeContract: 'Contract, px',
  edgeContractHint: 'Shrinks the mask inward; removes the light fringe',
  edgeFeather: 'Feather, px',
  edgeFeatherHint: 'Softens the cutout edge',
  edgeReset: 'Reset',

  outputsTitle: 'Exports',
  outputAdd: 'Add export',
  outputDelete: 'Delete export',
  outputName: 'Name',
  outputSettings: 'Export settings',
  outputDefaultName: 'Original',
  outputCopySuffix: '{name} copy',

  canvasLabel: 'Canvas',
  canvasOriginal: 'Original',
  canvasCustom: 'Custom',
  backgroundLabel: 'Background',
  bgTransparent: 'Transparent',
  bgSolid: 'Solid color',
  bgJpegNote:
    'JPEG has no alpha channel — transparent areas will be filled with white.',
  bgWhite: 'White',
  bgLightGray: 'Light gray',
  bgBlack: 'Black',
  bgCustomColor: 'Custom color',

  canvasWidth: 'Width, px',
  canvasHeight: 'Height, px',
  paddingLabel: 'Padding, %',
  paddingLink: 'Use same padding on all sides',
  paddingUnlink: 'Edit each side separately',
  marginTop: 'Top',
  marginRight: 'Right',
  marginBottom: 'Bottom',
  marginLeft: 'Left',
  alignmentLabel: 'Vertical alignment',
  alignmentTop: 'Top',
  alignmentMiddle: 'Middle',
  alignmentBottom: 'Bottom',
  allowZoom: 'Zoom to fit',
  allowZoomHint: 'Scale the subject above 100% to fill the padding',
  formatLabel: 'Format',
  qualityLabel: 'Quality',

  errorNoExportOutputs: 'Select at least one export.',
  exportPickerTitle: 'Exports to include',
  exportPickerHint: 'Each export goes into its own folder in the archive.',
  exportPickerCancel: 'Cancel',
  exportPickerConfirm: 'Export ZIP',

  progressProcessed: '{done} of {total} processed',
  progressEta: '~{eta} left',
  progressStop: 'Stop',
  progressStopHint: 'Finishes the current image, then stops',
  exportPreparing: 'Packing ZIP: {done} of {total}',
  selectedCount: '{selected} of {total} selected',

  badgeGpu: 'GPU',
  badgeCpu: 'CPU',
  fallbackNotice:
    'GPU acceleration failed; processing switched to the CPU and will be slower. Reason: {reason}',
  wasmModeNotice: 'GPU unavailable: processing runs on the CPU and will be slower.',

  diagTitle: 'Diagnostics',
  diagBackend: 'Backend',
  diagBackendWebgpu: 'WebGPU',
  diagBackendWasm: 'WASM (CPU)',
  diagFallbackReason: 'Fallback reason',
  diagAdapter: 'GPU adapter',
  diagIsolated: 'Cross-origin isolated',
  diagYes: 'Yes',
  diagNo: 'No',
  diagThreads: 'WASM threads',
  diagModelState: 'Model state',
  diagModelUrl: 'Model source',
  diagModelLoadMs: 'Download time',
  diagLastRunMs: 'Last inference',
  diagWarmupMs: 'Warm-up',
  diagClose: 'Close',
  diagBackendOverride: 'Force backend',
  diagBackendOverrideHint: 'Applies after reloading the tab',
  diagClearAll: 'Erase all data',
  diagPhaseReady: 'ready',
  diagPhaseDownloading: 'downloading',
  diagPhaseVerifying: 'verifying',
  diagPhaseCreating: 'initializing',
  diagPhaseFailed: 'failed',
  diagPhaseEvicted: 'evicted from cache',
  diagPhaseCanceled: 'canceled',
  diagPhaseDetecting: 'detecting',
  unitMs: '{value} ms',

  compareBefore: 'Before',
  compareAfter: 'After',
  viewerBack: 'Back to grid',
  viewerPrev: 'Previous image',
  viewerNext: 'Next image',

  overrideCreate: 'Customize this image',
  overrideActive: 'This image uses custom settings; the export is unchanged',
  overrideReset: 'Reset to export',
  overrideEditingOutput: 'Edits apply to export “{name}”',

  errorUnsupportedFile: 'Skipped “{name}”: PNG, JPEG, and WebP are supported.',
  errorDecode: 'Could not read the image. The file is damaged or not an image.',
  errorQuota: 'Not enough browser storage. Export what is ready and clear the session.',
  errorCritical:
    'Could not start processing on GPU or CPU. This extension cannot run on this device.',
  errorProcessing: 'Processing failed. Retry this image or try again later.',
  warnQuota: 'Storage is nearly full. Export what is ready and start a new session.',
  warnNoPersist:
    'The browser denied persistent storage: the model may need to be downloaded again.',

  confirmClearSession: 'Clear this session? Current images and results will be removed.',
  confirmDeleteSelected: 'Delete the selected images?',
  confirmEraseAll:
    'Erase all data? This removes the session, settings, and the cached model.',
  confirmCancel: 'Cancel',
  confirmOk: 'Confirm',

  close: 'Close',
  toastDismiss: 'Dismiss',

  // About page itself is English-only; only the studio chrome link is localized.
  aboutLinkLabel: 'About',
} as const;

export type MessageKey = keyof typeof en;

const ru: Record<MessageKey, string> = {
  appName: 'PNG Maker',

  sessionClear: 'Очистить',
  exportZip: 'Экспорт ZIP',
  addImages: 'Добавить изображения',

  emptyTitle: 'Перетащите изображения сюда',
  emptyChooseFiles: 'Выбрать файлы',
  emptyPasteHint: 'или вставьте из буфера обмена (Ctrl/Cmd + V)',
  emptyPrivacy:
    'После разовой загрузки модели расширение работает офлайн: изображения никуда не отправляются.',

  modelDownloading: 'Загрузка модели: {loaded} из {total}',
  modelCancel: 'Отменить',
  modelFailed: 'Не удалось загрузить модель',
  modelRetry: 'Повторить',
  modelEvicted: 'Модель удалена из хранилища браузера — скачайте снова',
  modelDownload: 'Скачать модель',
  modelVerifying: 'Проверка модели…',
  modelCreating: 'Инициализация модели…',

  statusQueued: 'В очереди',
  statusSegmenting: 'Поиск объекта…',
  statusComposing: 'Отрисовка…',
  statusDone: 'Готово',
  statusFailed: 'Ошибка',

  cardRetry: 'Повторить',
  cardDelete: 'Удалить',
  cardDownload: 'Скачать',
  cardOpenPreview: 'Открыть просмотр',
  cardRename: 'Переименовать',
  cardEmptyMask: 'Объект не найден',
  cardOverride: 'Свои настройки',
  cardSelect: 'Выбрать {name}',

  edgeTitle: 'Уточнение края',
  edgeSharedNote: 'Общее для всех экспортов',
  edgeThreshold: 'Порог',
  edgeThresholdHint: 'Альфа ниже этого значения становится полностью прозрачной',
  edgeContract: 'Сжатие, px',
  edgeContractHint: 'Сжимает маску внутрь; убирает светлый ореол',
  edgeFeather: 'Растушёвка, px',
  edgeFeatherHint: 'Смягчает край выреза',
  edgeReset: 'Сбросить',

  outputsTitle: 'Экспорты',
  outputAdd: 'Добавить экспорт',
  outputDelete: 'Удалить экспорт',
  outputName: 'Название',
  outputSettings: 'Настройки экспорта',
  outputDefaultName: 'Original',
  outputCopySuffix: '{name} — копия',

  canvasLabel: 'Холст',
  canvasOriginal: 'Как в оригинале',
  canvasCustom: 'Заданный',
  backgroundLabel: 'Фон',
  bgTransparent: 'Прозрачный',
  bgSolid: 'Сплошной цвет',
  bgJpegNote:
    'У JPEG нет альфа-канала — прозрачные области будут залиты белым.',
  bgWhite: 'Белый',
  bgLightGray: 'Светло-серый',
  bgBlack: 'Чёрный',
  bgCustomColor: 'Свой цвет',

  canvasWidth: 'Ширина, px',
  canvasHeight: 'Высота, px',
  paddingLabel: 'Отступ, %',
  paddingLink: 'Одинаковый отступ со всех сторон',
  paddingUnlink: 'Задать стороны по отдельности',
  marginTop: 'Сверху',
  marginRight: 'Справа',
  marginBottom: 'Снизу',
  marginLeft: 'Слева',
  alignmentLabel: 'Выравнивание по вертикали',
  alignmentTop: 'По верху',
  alignmentMiddle: 'По центру',
  alignmentBottom: 'По низу',
  allowZoom: 'Масштабировать по размеру',
  allowZoomHint: 'Увеличивать объект выше 100%, чтобы заполнить отступы',
  formatLabel: 'Формат',
  qualityLabel: 'Качество',

  errorNoExportOutputs: 'Отметьте хотя бы один экспорт.',
  exportPickerTitle: 'Экспорты в архив',
  exportPickerHint: 'Каждый экспорт попадает в свою папку в архиве.',
  exportPickerCancel: 'Отмена',
  exportPickerConfirm: 'Экспорт ZIP',

  progressProcessed: 'Обработано {done} из {total}',
  progressEta: 'осталось ~{eta}',
  progressStop: 'Остановить',
  progressStopHint: 'Завершит текущее изображение и остановится',
  exportPreparing: 'Сборка ZIP: {done} из {total}',
  selectedCount: 'Выбрано {selected} из {total}',

  badgeGpu: 'GPU',
  badgeCpu: 'CPU',
  fallbackNotice:
    'Не удалось запустить GPU-ускорение; обработка переключена на процессор и будет медленнее. Причина: {reason}',
  wasmModeNotice: 'GPU недоступен: обработка идёт на процессоре и будет медленнее.',

  diagTitle: 'Диагностика',
  diagBackend: 'Бэкенд',
  diagBackendWebgpu: 'WebGPU',
  diagBackendWasm: 'WASM (CPU)',
  diagFallbackReason: 'Причина фолбэка',
  diagAdapter: 'GPU-адаптер',
  diagIsolated: 'Cross-origin isolated',
  diagYes: 'Да',
  diagNo: 'Нет',
  diagThreads: 'Потоки WASM',
  diagModelState: 'Состояние модели',
  diagModelUrl: 'Источник модели',
  diagModelLoadMs: 'Время загрузки',
  diagLastRunMs: 'Последний прогон',
  diagWarmupMs: 'Прогрев',
  diagClose: 'Закрыть',
  diagBackendOverride: 'Принудительный бэкенд',
  diagBackendOverrideHint: 'Применяется после перезагрузки вкладки',
  diagClearAll: 'Стереть все данные',
  diagPhaseReady: 'готова',
  diagPhaseDownloading: 'загрузка',
  diagPhaseVerifying: 'проверка',
  diagPhaseCreating: 'инициализация',
  diagPhaseFailed: 'ошибка',
  diagPhaseEvicted: 'вытеснена из кэша',
  diagPhaseCanceled: 'отменена',
  diagPhaseDetecting: 'определение',
  unitMs: '{value} мс',

  compareBefore: 'До',
  compareAfter: 'После',
  viewerBack: 'К сетке',
  viewerPrev: 'Предыдущее изображение',
  viewerNext: 'Следующее изображение',

  overrideCreate: 'Только для этого изображения',
  overrideActive: 'У изображения свои настройки — экспорт не меняется',
  overrideReset: 'Вернуть к экспорту',
  overrideEditingOutput: 'Правки меняют экспорт «{name}»',

  errorUnsupportedFile: 'Файл «{name}» пропущен: поддерживаются PNG, JPEG и WebP.',
  errorDecode: 'Не удалось прочитать изображение. Файл повреждён или не является картинкой.',
  errorQuota:
    'Недостаточно места в хранилище браузера. Экспортируйте готовое и очистите сессию.',
  errorCritical:
    'Не удалось запустить обработку ни на GPU, ни на процессоре. Расширение не может работать на этом устройстве.',
  errorProcessing: 'Обработка не удалась. Повторите для этого изображения или позже.',
  warnQuota: 'Хранилище почти заполнено. Экспортируйте готовое и начните новую сессию.',
  warnNoPersist:
    'Браузер не дал разрешения на постоянное хранение: модель может потребовать повторной загрузки.',

  confirmClearSession: 'Очистить сессию? Текущие изображения и результаты будут удалены.',
  confirmDeleteSelected: 'Удалить выбранные изображения?',
  confirmEraseAll:
    'Стереть все данные? Будут удалены сессия, настройки и кэш модели.',
  confirmCancel: 'Отмена',
  confirmOk: 'Подтвердить',

  close: 'Закрыть',
  toastDismiss: 'Закрыть',

  aboutLinkLabel: 'About',
};

const dictionaries = { en, ru };

export type Locale = keyof typeof dictionaries;

let currentLocale: Locale = 'en';

export function detectLocale(): Locale {
  const lang = typeof navigator !== 'undefined' ? navigator.language : 'en';
  return lang.toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function t(
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  let text: string = dictionaries[currentLocale][key];
  if (params !== undefined) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

export function formatBytes(bytes: number): string {
  if (currentLocale === 'ru') {
    if (bytes >= 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} МБ`;
    return `${Math.round(bytes / 1024)} КБ`;
  }
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

export function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (currentLocale === 'ru') {
    if (seconds < 60) return `${seconds} с`;
    return `${Math.floor(seconds / 60)} мин ${seconds % 60} с`;
  }
  if (seconds < 60) return `${seconds} s`;
  return `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
}
