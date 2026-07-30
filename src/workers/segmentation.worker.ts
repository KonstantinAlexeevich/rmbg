import type { Rect } from '../core/types';
import {
  computeBbox,
  postprocess,
  preprocess,
  secondPassRect,
  toOriginalCoords,
} from '../core/inference/isnet';
import {
  createSession,
  runIsnet,
  warmup,
  type IsnetSession,
} from '../core/inference/session';
import { readCachedModel } from '../core/storage/model-cache';
import { decodeImage, makeThumbnail } from '../core/image/decode';
import { expandMask, refineMask } from '../core/image/mask';
import { composeOnCanvas, cutout } from '../core/image/compose';
import { encodeCanvas } from '../core/image/encode';
import type {
  SegmentPayload,
  SegmentationRequest,
  SegmentationResponse,
} from './protocol';

let isnet: IsnetSession | null = null;

function respond(message: SegmentationResponse): void {
  self.postMessage(message);
}

self.onmessage = async (event: MessageEvent<SegmentationRequest>) => {
  const request = event.data;
  try {
    switch (request.type) {
      case 'init': {
        const bytes = await readCachedModel(request.modelCacheUrl);
        if (bytes === null) {
          throw new Error('Весов модели нет в кэше — требуется загрузка');
        }
        isnet = await createSession(request.backend, bytes, request.ortWasmDir);
        // на WASM прогрев — полноценный инференс на CPU без выгоды; не греем
        const warmupMs = request.warmup ? await warmup(isnet) : 0;
        respond({
          type: 'init-done',
          requestId: request.requestId,
          warmupMs,
          crossOriginIsolated: self.crossOriginIsolated,
          wasmThreads: self.crossOriginIsolated
            ? Math.min(4, navigator.hardwareConcurrency || 1)
            : 1,
        });
        break;
      }
      case 'segment': {
        if (isnet === null) throw new Error('Сессия не инициализирована');
        const payload = await segment(isnet, request.blob);
        respond({ type: 'segment-done', requestId: request.requestId, payload });
        break;
      }
      case 'compose': {
        const source = await decodeImage(request.original);
        const maskBitmap = await createImageBitmap(request.mask);
        try {
          const expanded = expandMask(
            maskBitmap,
            request.coverage,
            source.width,
            source.height,
          );
          const refined = refineMask(expanded, request.edge);
          const cut = cutout(source, refined);
          const canvas = composeOnCanvas(cut, request.bbox, request.preset);
          const blob = await encodeCanvas(
            canvas,
            request.preset.output.format,
            request.preset.output.quality,
          );
          const thumbnail = await makeThumbnail(canvas);
          respond({
            type: 'compose-done',
            requestId: request.requestId,
            payload: { blob, thumbnail, width: canvas.width, height: canvas.height },
          });
        } finally {
          source.close();
          maskBitmap.close();
        }
        break;
      }
    }
  } catch (e) {
    respond({
      type: 'error',
      requestId: request.requestId,
      message: e instanceof Error ? e.message : String(e),
    });
  }
};

async function segment(session: IsnetSession, blob: Blob): Promise<SegmentPayload> {
  const bitmap = await decodeImage(blob);
  const start = performance.now();
  try {
    const fullFrame: Rect = { x: 0, y: 0, width: bitmap.width, height: bitmap.height };

    // проход 1: весь кадр через letterbox
    const pass1 = preprocess(bitmap, fullFrame);
    const output1 = await runIsnet(session, pass1.tensor);
    let mask = postprocess(output1, pass1.geometry);
    let coverage: Rect = { x: 0, y: 0, width: 1, height: 1 };
    let passes: 1 | 2 = 1;
    let secondPassEmpty = false;

    const bboxInMask = computeBbox(mask);
    // вырожденный случай: маска пустая — bbox равен всему кадру
    const empty = bboxInMask === null;
    let bbox: Rect =
      bboxInMask === null
        ? { x: 0, y: 0, width: 1, height: 1 }
        : toOriginalCoords(bboxInMask, coverage);

    // проход 2: мелкий объект прогоняется повторно по вырезке вокруг bbox
    if (!empty) {
      const cropRect = secondPassRect(bbox, bitmap.width, bitmap.height);
      if (cropRect !== null) {
        const pass2 = preprocess(bitmap, cropRect);
        const output2 = await runIsnet(session, pass2.tensor);
        const refinedMask = postprocess(output2, pass2.geometry);
        const refinedBbox = computeBbox(refinedMask);
        if (refinedBbox === null) {
          // молча отдать пустой результат хуже, чем грубую маску
          secondPassEmpty = true;
        } else {
          mask = refinedMask;
          passes = 2;
          coverage = {
            x: cropRect.x / bitmap.width,
            y: cropRect.y / bitmap.height,
            width: cropRect.width / bitmap.width,
            height: cropRect.height / bitmap.height,
          };
          bbox = toOriginalCoords(refinedBbox, coverage);
        }
      }
    }

    const canvas = new OffscreenCanvas(mask.width, mask.height);
    const ctx = canvas.getContext('2d');
    if (ctx === null) throw new Error('Не удалось создать 2d-контекст');
    ctx.putImageData(mask, 0, 0);
    const maskBlob = await canvas.convertToBlob({ type: 'image/png' });

    return {
      blob: maskBlob,
      coverage,
      bbox,
      empty,
      secondPassEmpty,
      passes,
      durationMs: performance.now() - start,
    };
  } finally {
    bitmap.close();
  }
}
