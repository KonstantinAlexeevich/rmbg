// Все строки интерфейса в одном словаре; английский добавляется как второй
// словарь без изменений в компонентах.
const ru = {
  appName: 'rmbg',
  headerClear: 'Очистить',
  headerDownloadZip: 'Скачать всё',
  footerAddFiles: 'Добавить файлы',

  emptyTitle: 'Перетащите изображения сюда',
  emptyChooseFiles: 'Выбрать файлы',
  emptyPasteHint: 'или вставьте из буфера обмена (Ctrl/Cmd + V)',
  emptyPrivacy:
    'После разовой загрузки модели расширение работает офлайн: изображения никуда не отправляются.',

  modelDownloading: 'Загрузка модели: {loaded} из {total}',
  modelCancel: 'Отменить',
  modelFailed: 'Не удалось загрузить модель',
  modelRetry: 'Повторить',
  modelEvicted: 'Модель удалена браузером, нужно скачать снова',
  modelDownload: 'Скачать',
  modelPreparing: 'Модель готовится…',
  modelWaiting: 'Модель загружается…',
  modelVerifying: 'Проверка модели…',
  modelCreating: 'Инициализация модели…',

  statusQueued: 'В очереди',
  statusSegmenting: 'Обработка…',
  statusComposing: 'Композиция…',
  statusDone: 'Готово',
  statusFailed: 'Ошибка',
  cardRetry: 'Повторить',
  cardDelete: 'Удалить',
  cardDownload: 'Скачать',
  cardZoom: 'Увеличить',
  cardRename: 'Переименовать',
  cardEmptyMask: 'Фон не найден',

  settingsPresets: 'Пресеты',
  settingsPresetAdd: 'Добавить пресет',
  settingsPresetDelete: 'Удалить',
  settingsPresetName: 'Название',
  settingsPresetExport: 'В экспорт',
  settingsPresetActive: 'Активный',
  settingsSizeMode: 'Размер',
  settingsSizeOriginal: 'Оригинальный',
  settingsSizeFixed: 'Заданный',
  settingsBackground: 'Фон',
  settingsBgTransparent: 'Прозрачный',
  settingsBgSolid: 'Однотонный',
  settingsBgJpegNote: 'JPEG не поддерживает прозрачность — фон будет однотонным.',
  settingsEdge: 'Край маски',
  settingsEdgeSharedNote: 'Общий для всех пресетов',
  settingsEdgeThreshold: 'Жёсткость края',
  settingsEdgeErode: 'Убрать светлый ореол',
  settingsEdgeFeather: 'Смягчить кромку',
  settingsEdgeReset: 'Сбросить',
  settingsPresetSettings: 'Настройки пресета',
  settingsCanvasWidth: 'Ширина холста',
  settingsCanvasHeight: 'Высота холста',
  settingsMargins: 'Поля, %',
  settingsMarginsLinked: 'Одинаковые поля',
  settingsMarginTop: 'Сверху',
  settingsMarginRight: 'Справа',
  settingsMarginBottom: 'Снизу',
  settingsMarginLeft: 'Слева',
  settingsAnchor: 'Привязка по вертикали',
  settingsAnchorCenter: 'Центр',
  settingsAnchorTop: 'Верх',
  settingsAnchorBottom: 'Низ',
  settingsNoUpscale: 'Не увеличивать объект',
  settingsFormat: 'Формат',
  settingsQuality: 'Качество',
  errorNoExportPresets: 'Отметьте хотя бы один пресет для экспорта.',
  exportPickerTitle: 'Пресеты для экспорта',
  exportPickerCancel: 'Отмена',
  exportPickerConfirm: 'Скачать ZIP',

  progressProcessed: 'Обработано {done} из {total}',
  progressEta: 'осталось примерно {eta}',
  progressStop: 'Остановить',
  exportPreparing: 'Сборка архива: {done} из {total}',

  badgeGpu: 'GPU',
  badgeCpu: 'CPU',
  fallbackNotice:
    'Не удалось запустить GPU-ускорение, обработка переключена на процессор и будет медленнее. Причина: {reason}',
  wasmModeNotice: 'GPU недоступен: обработка идёт на процессоре и будет медленнее.',

  diagTitle: 'Диагностика',
  diagBackend: 'Бэкенд',
  diagFallbackReason: 'Причина фолбэка',
  diagAdapter: 'GPU-адаптер',
  diagIsolated: 'crossOriginIsolated',
  diagThreads: 'Потоки WASM',
  diagModelState: 'Состояние модели',
  diagModelUrl: 'URL зеркала',
  diagModelLoadMs: 'Время загрузки модели',
  diagLastRunMs: 'Последний прогон',
  diagWarmupMs: 'Прогрев',
  diagClose: 'Закрыть',
  diagBackendOverride: 'Принудительный бэкенд (после перезагрузки вкладки)',
  diagClearAll: 'Очистить все данные',

  compareBefore: 'До',
  compareAfter: 'После',
  viewerBack: 'К сетке',
  viewerClose: 'Закрыть просмотр',

  overrideCreate: 'Только для этой картинки',
  overrideActive: 'Свои настройки для этой картинки — пресет не меняется',
  overrideReset: 'Вернуть к пресету',
  overrideEditingPreset: 'Правки меняют пресет «{name}»',
  cardOverride: 'Есть переопределение',

  errorUnsupportedFile: 'Файл «{name}» пропущен: поддерживаются PNG, JPEG и WebP.',
  errorDecode: 'Не удалось прочитать изображение. Файл повреждён или не является картинкой.',
  errorQuota:
    'Недостаточно места в хранилище браузера. Скачайте готовое и очистите сессию.',
  errorCritical:
    'Не удалось запустить обработку ни на GPU, ни на процессоре. Расширение не может работать на этом устройстве.',
  warnQuota: 'Хранилище почти заполнено. Скачайте готовое и начните новую сессию.',
  warnNoPersist:
    'Браузер не дал разрешения на постоянное хранение: модель может потребовать повторной загрузки.',

  confirmClear: 'Очистить сессию? Текущие изображения и результаты будут удалены.',
  confirmDeleteSelected: 'Удалить выбранные изображения?',
  selectedCount: 'Выбрано: {count}',
} as const;

export type MessageKey = keyof typeof ru;

const en: Record<MessageKey, string> = {
  ...ru,
  // Заготовка под второй язык: сейчас словарь совпадает с русским,
  // перевод добавляется здесь без изменений в компонентах.
};

const dictionaries = { ru, en };

export type Locale = keyof typeof dictionaries;

let currentLocale: Locale = 'ru';

export function setLocale(locale: Locale): void {
  currentLocale = locale;
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
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} МБ`;
  return `${Math.round(bytes / 1024)} КБ`;
}

export function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds} с`;
  return `${Math.floor(seconds / 60)} мин ${seconds % 60} с`;
}
