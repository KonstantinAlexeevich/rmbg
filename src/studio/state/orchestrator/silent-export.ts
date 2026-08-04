import { deleteItems } from '../../../core/storage/db';
import { t } from '../i18n';
import {
  clearAutoDownloadPreset,
  db,
  isEphemeral,
  isQuotaError,
  releaseUrls,
  store,
} from './context';
import { downloadItem } from './exporting';

/** После compose: скачать результат и убрать ephemeral item из сессии. */
export async function finishSilentExport(itemId: string): Promise<void> {
  clearAutoDownloadPreset(itemId);
  await downloadItem(itemId);
  if (!isEphemeral(itemId)) return;
  await deleteItems(db, [itemId]);
  releaseUrls([itemId]);
  store.getState().removeItems([itemId]);
}

/** Ошибка silent Save: убрать ephemeral, без failed-карточки. */
export async function abortSilentExport(
  itemId: string,
  itemName: string,
  error: unknown,
): Promise<void> {
  clearAutoDownloadPreset(itemId);
  if (!isEphemeral(itemId)) return;

  try {
    await deleteItems(db, [itemId]);
  } catch {
    // ignore
  }
  releaseUrls([itemId]);
  store.getState().removeItems([itemId]);

  if (isQuotaError(error)) {
    store.getState().addToast('error', t('errorQuota'));
  }
  console.error(`Silent export failed for ${itemName}:`, error);
}
