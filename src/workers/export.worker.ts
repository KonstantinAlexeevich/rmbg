import { openDatabase, getItem } from '../core/storage/db';
import { decodeImage } from '../core/image/decode';
import { expandMask, refineMask } from '../core/image/mask';
import { composeOnCanvas, cutout } from '../core/image/compose';
import { encodeCanvas, extensionForFormat } from '../core/image/encode';
import { settingsHash } from '../core/storage/settings';
import type { Preset } from '../core/preset/types';
import type { EdgeSettings, ItemRecord } from '../core/types';
import { ZipBuilder, archiveFileName, uniqueFolderNames } from '../core/zip/archive';
import type { ExportRequest, ExportResponse } from './protocol';

function respond(message: ExportResponse): void {
  self.postMessage(message);
}

async function composeForPreset(
  item: ItemRecord,
  preset: Preset,
  edge: EdgeSettings,
): Promise<{ blob: Blob; format: Preset['output']['format'] }> {
  if (item.mask === null) {
    throw new Error(`Нет маски для «${item.name}»`);
  }
  const source = await decodeImage(item.source.blob);
  const maskBitmap = await createImageBitmap(item.mask.blob);
  try {
    const expanded = expandMask(
      maskBitmap,
      item.mask.coverage,
      source.width,
      source.height,
    );
    const refined = refineMask(expanded, edge);
    const cut = cutout(source, refined);
    const canvas = composeOnCanvas(cut, item.mask.bbox, preset);
    const blob = await encodeCanvas(canvas, preset.output.format, preset.output.quality);
    return { blob, format: preset.output.format };
  } finally {
    source.close();
    maskBitmap.close();
  }
}

self.onmessage = async (event: MessageEvent<ExportRequest>) => {
  const request = event.data;
  try {
    const db = await openDatabase();
    const zip = new ZipBuilder();
    const folders = uniqueFolderNames(request.presets.map((p) => p.name));
    const total = request.itemIds.length * request.presets.length;
    let done = 0;

    for (let pi = 0; pi < request.presets.length; pi++) {
      const preset = request.presets[pi];
      const folder = folders[pi];
      if (preset === undefined || folder === undefined) continue;
      const presetHash = settingsHash(preset, request.edge);

      for (const itemId of request.itemIds) {
        const item = await getItem(db, itemId);
        if (item !== null && item.mask !== null) {
          const canReuse =
            preset.id === request.activePresetId &&
            item.result !== null &&
            item.result.settingsHash === presetHash;

          let blob: Blob;
          let format: Preset['output']['format'];
          if (canReuse && item.result !== null) {
            blob = item.result.blob;
            format = item.result.format;
          } else {
            const composed = await composeForPreset(item, preset, request.edge);
            blob = composed.blob;
            format = composed.format;
          }

          const name = zip.uniqueName(item.name, extensionForFormat(format), folder);
          zip.add(name, new Uint8Array(await blob.arrayBuffer()));
        }
        done++;
        respond({
          type: 'zip-progress',
          requestId: request.requestId,
          done,
          total,
        });
      }
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
