import { openDatabase, getItem } from '../core/storage/db';
import { extensionForFormat } from '../core/image/encode';
import { ZipBuilder, archiveFileName } from '../core/zip/archive';
import type { ExportRequest, ExportResponse } from './protocol';

function respond(message: ExportResponse): void {
  self.postMessage(message);
}

self.onmessage = async (event: MessageEvent<ExportRequest>) => {
  const request = event.data;
  try {
    const db = await openDatabase();
    const zip = new ZipBuilder();
    let done = 0;

    // файлы читаются из IndexedDB по одному, а не собираются в память целиком
    for (const itemId of request.itemIds) {
      const item = await getItem(db, itemId);
      if (item !== null && item.result !== null) {
        const name = zip.uniqueName(item.name, extensionForFormat(item.result.format));
        zip.add(name, new Uint8Array(await item.result.blob.arrayBuffer()));
      }
      done++;
      respond({
        type: 'zip-progress',
        requestId: request.requestId,
        done,
        total: request.itemIds.length,
      });
    }

    const blob = await zip.finish();
    respond({
      type: 'zip-done',
      requestId: request.requestId,
      blob,
      fileName: archiveFileName(),
    });
  } catch (e) {
    respond({
      type: 'error',
      requestId: request.requestId,
      message: e instanceof Error ? e.message : String(e),
    });
  }
};
