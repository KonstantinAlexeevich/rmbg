import { resolveExportPresets } from '../../../core/storage/settings';
import { getItem } from '../../../core/storage/db';
import { extensionForFormat } from '../../../core/image/encode';
import { downloadBlob as platformDownloadBlob } from '../../../platform/download';
import { t } from '../i18n';
import { ExportWorkerClient } from '../workers';
import { db, exportWorker, setExportWorker, store } from './context';

export async function exportZip(): Promise<void> {
  const state = store.getState();
  if (state.exporting.running) return;

  // в архив попадают только выбранные карточки со статусом done
  const ids = state.items
    .filter((i) => i.selected && i.status === 'done')
    .map((i) => i.id);
  if (ids.length === 0) return;

  const presets = resolveExportPresets(state.settings);
  if (presets.length === 0) {
    state.addToast('error', t.errorNoExportOutputs());
    return;
  }

  let worker = exportWorker;
  if (worker === null) {
    worker = new ExportWorkerClient();
    setExportWorker(worker);
  }
  const total = ids.length * presets.length;
  state.setExporting({ running: true, done: 0, total });
  try {
    const { blob, fileName } = await worker.zip(
      ids,
      presets,
      state.settings.edge,
      state.settings.activePresetId,
      (done, nextTotal) => {
        store.getState().setExporting({ done, total: nextTotal });
      },
    );
    await downloadBlob(blob, fileName, true);
  } catch (e) {
    store.getState().addToast('error', e instanceof Error ? e.message : String(e));
  } finally {
    store.getState().setExporting({ running: false, done: 0, total: 0 });
  }
}

export async function downloadItem(id: string): Promise<void> {
  const record = await getItem(db, id);
  if (record === null || record.result === null) return;
  const base = record.name.replace(/\.[^.]+$/, '');
  await downloadBlob(
    record.result.blob,
    `${base}.${extensionForFormat(record.result.format)}`,
    false,
  );
}

async function downloadBlob(blob: Blob, filename: string, saveAs: boolean): Promise<void> {
  try {
    await platformDownloadBlob(blob, filename, saveAs);
  } catch (e) {
    // отмена диалога сохранения не ошибка
    if (e instanceof Error && !e.message.includes('canceled')) {
      store.getState().addToast('error', e.message);
    }
  }
}
