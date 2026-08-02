import { loadSettings } from '../../../core/storage/settings';
import {
  createSession,
  latestSession,
  openDatabase,
  putItem,
  sessionItems,
} from '../../../core/storage/db';
import { setLocale, t } from '../i18n';
import { SegmentationWorkerClient } from '../workers';
import {
  db,
  sessionId,
  setDb,
  setSegWorker,
  setSessionId,
  store,
  toView,
} from './context';
import { startModelPipeline } from './model';
import { processAll } from './queue';

export async function bootstrap(): Promise<void> {
  const settings = await loadSettings();
  setLocale(settings.ui.locale);
  document.documentElement.lang = settings.ui.locale;
  store.getState().setSettings(settings);

  setDb(await openDatabase());

  // восстановление последней сессии или создание новой
  let session = await latestSession(db);
  if (session === null) {
    session = await createSession(db, settings.activePresetId);
  }
  setSessionId(session.id);

  const items = await sessionItems(db, sessionId);
  // незавершённые статусы прошлой сессии откатываются: с готовым результатом —
  // done, иначе обратно в очередь (сегментация пропустится, если маска есть)
  for (const item of items) {
    // legacy до IDB v2: поле могло отсутствовать
    if (!Array.isArray(item.overrides)) {
      item.overrides = [];
      await putItem(db, item);
    }
    if (item.status === 'segmenting' || item.status === 'composing') {
      item.status = item.result !== null ? 'done' : 'queued';
      await putItem(db, item);
    }
  }
  store.getState().setItems(items.map((item) => toView(item, settings)));

  // предупреждение о заполнении квоты origin
  const estimate = await navigator.storage.estimate();
  if (
    estimate.quota !== undefined &&
    estimate.usage !== undefined &&
    estimate.quota > 0 &&
    estimate.usage / estimate.quota > 0.8
  ) {
    store.getState().addToast('warning', t('warnQuota'));
  }

  // воркеры создаются сразу: композиция не требует сессии модели
  setSegWorker(new SegmentationWorkerClient());

  await startModelPipeline();
  // восстановленная очередь / stale — без кнопки «Обработать»
  void processAll();
}
