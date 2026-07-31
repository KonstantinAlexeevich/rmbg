import { openDatabase, getItem } from '../core/storage/db';
import { runComposePipeline } from '../core/image/pipeline';
import { extensionForFormat } from '../core/image/encode';
import { settingsHash } from '../core/storage/settings';
import { resolveComposition } from '../core/preset/override';
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
  const composed = await runComposePipeline({
    original: item.source.blob,
    mask: item.mask.blob,
    coverage: item.mask.coverage,
    bbox: item.mask.bbox,
    edge,
    preset,
  });
  return { blob: composed.blob, format: preset.output.format };
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
      const basePreset = request.presets[pi];
      const folder = folders[pi];
      if (basePreset === undefined || folder === undefined) continue;

      for (const itemId of request.itemIds) {
        const item = await getItem(db, itemId);
        if (item !== null && item.mask !== null) {
          const { preset, edge } = resolveComposition(
            basePreset,
            request.edge,
            item.overrides,
          );
          const effectiveHash = settingsHash(preset, edge);

          const canReuse =
            basePreset.id === request.activePresetId &&
            item.result !== null &&
            item.result.settingsHash === effectiveHash;

          let blob: Blob;
          let format: Preset['output']['format'];
          if (canReuse && item.result !== null) {
            blob = item.result.blob;
            format = item.result.format;
          } else {
            const composed = await composeForPreset(item, preset, edge);
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
