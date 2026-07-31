import type { EdgeSettings, Rect } from '../types';
import type { Preset } from '../preset/types';
import { decodeImage } from './decode';
import { expandMask, refineMask } from './mask';
import { composeOnCanvas, cutout } from './compose';
import { encodeCanvas } from './encode';

export type ComposePipelineInput = {
  original: Blob;
  mask: Blob;
  coverage: Rect;
  bbox: Rect;
  edge: EdgeSettings;
  preset: Preset;
};

export type ComposePipelineResult = {
  blob: Blob;
  canvas: OffscreenCanvas;
  width: number;
  height: number;
};

// Цепочка на уже декодированных bitmap'ах (вызывающий закрывает их сам).
export async function composeFromBitmaps(
  source: ImageBitmap,
  maskBitmap: ImageBitmap,
  coverage: Rect,
  bbox: Rect,
  edge: EdgeSettings,
  preset: Preset,
): Promise<ComposePipelineResult> {
  const expanded = expandMask(maskBitmap, coverage, source.width, source.height);
  const refined = refineMask(expanded, edge);
  const cut = cutout(source, refined);
  const canvas = composeOnCanvas(cut, bbox, preset);
  const blob = await encodeCanvas(
    canvas,
    preset.output.format,
    preset.output.quality,
  );
  return { blob, canvas, width: canvas.width, height: canvas.height };
}

// Единая цепочка: decode → expand → refine → cutout → compose → encode.
// Bitmap'ы закрываются внутри; canvas остаётся у вызывающего (для thumbnail).
export async function runComposePipeline(
  input: ComposePipelineInput,
): Promise<ComposePipelineResult> {
  const source = await decodeImage(input.original);
  const maskBitmap = await createImageBitmap(input.mask);
  try {
    return await composeFromBitmaps(
      source,
      maskBitmap,
      input.coverage,
      input.bbox,
      input.edge,
      input.preset,
    );
  } finally {
    source.close();
    maskBitmap.close();
  }
}
