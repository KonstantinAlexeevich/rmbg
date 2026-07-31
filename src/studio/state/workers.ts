import type { Backend, EdgeSettings, Rect } from '../../core/types';
import type { Preset } from '../../core/preset/types';
import type {
  ComposeComparePayload,
  ComposePayload,
  ExportRequest,
  ExportResponse,
  SegmentPayload,
  SegmentationRequest,
  SegmentationResponse,
} from '../../workers/protocol';

type Pending = {
  resolve: (value: never) => void;
  reject: (error: Error) => void;
};

export type InitResult = {
  warmupMs: number;
  crossOriginIsolated: boolean;
  wasmThreads: number;
};

export class SegmentationWorkerClient {
  private readonly worker: Worker;
  private readonly pending = new Map<number, Pending>();
  private nextId = 1;

  constructor() {
    this.worker = new Worker(
      new URL('../../workers/segmentation.worker.ts', import.meta.url),
      { type: 'module' },
    );
    this.worker.onmessage = (event: MessageEvent<SegmentationResponse>) => {
      const response = event.data;
      const pending = this.pending.get(response.requestId);
      if (pending === undefined) return;
      this.pending.delete(response.requestId);
      if (response.type === 'error') {
        pending.reject(new Error(response.message));
        return;
      }
      switch (response.type) {
        case 'init-done':
          (pending.resolve as (v: InitResult) => void)({
            warmupMs: response.warmupMs,
            crossOriginIsolated: response.crossOriginIsolated,
            wasmThreads: response.wasmThreads,
          });
          break;
        case 'segment-done':
          (pending.resolve as (v: SegmentPayload) => void)(response.payload);
          break;
        case 'compose-done':
          (pending.resolve as (v: ComposePayload) => void)(response.payload);
          break;
        case 'compose-compare-done':
          (pending.resolve as (v: ComposeComparePayload) => void)(response.payload);
          break;
      }
    };
  }

  private send<T>(request: SegmentationRequest): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.pending.set(request.requestId, {
        resolve: resolve as (value: never) => void,
        reject,
      });
      this.worker.postMessage(request);
    });
  }

  init(
    backend: Backend,
    modelCacheUrl: string,
    ortWasmDir: string,
    warmup: boolean,
  ): Promise<InitResult> {
    return this.send<InitResult>({
      type: 'init',
      requestId: this.nextId++,
      backend,
      modelCacheUrl,
      ortWasmDir,
      warmup,
    });
  }

  segment(blob: Blob): Promise<SegmentPayload> {
    return this.send<SegmentPayload>({
      type: 'segment',
      requestId: this.nextId++,
      blob,
    });
  }

  compose(
    original: Blob,
    mask: Blob,
    coverage: Rect,
    bbox: Rect,
    edge: EdgeSettings,
    preset: Preset,
  ): Promise<ComposePayload> {
    return this.send<ComposePayload>({
      type: 'compose',
      requestId: this.nextId++,
      original,
      mask,
      coverage,
      bbox,
      edge,
      preset,
    });
  }

  composeCompare(
    original: Blob,
    mask: Blob,
    coverage: Rect,
    bbox: Rect,
    edge: EdgeSettings,
    preset: Preset,
  ): Promise<ComposeComparePayload> {
    return this.send<ComposeComparePayload>({
      type: 'compose-compare',
      requestId: this.nextId++,
      original,
      mask,
      coverage,
      bbox,
      edge,
      preset,
    });
  }

  terminate(): void {
    this.worker.terminate();
    for (const pending of this.pending.values()) {
      pending.reject(new Error('Воркер остановлен'));
    }
    this.pending.clear();
  }
}

export class ExportWorkerClient {
  private readonly worker: Worker;
  private nextId = 1;

  constructor() {
    this.worker = new Worker(
      new URL('../../workers/export.worker.ts', import.meta.url),
      { type: 'module' },
    );
  }

  zip(
    itemIds: string[],
    presets: Preset[],
    edge: EdgeSettings,
    activePresetId: string,
    onProgress: (done: number, total: number) => void,
  ): Promise<{ blob: Blob; fileName: string }> {
    const requestId = this.nextId++;
    return new Promise((resolve, reject) => {
      const handler = (event: MessageEvent<ExportResponse>) => {
        const response = event.data;
        if (response.requestId !== requestId) return;
        switch (response.type) {
          case 'zip-progress':
            onProgress(response.done, response.total);
            break;
          case 'zip-done':
            this.worker.removeEventListener('message', handler);
            resolve({ blob: response.blob, fileName: response.fileName });
            break;
          case 'error':
            this.worker.removeEventListener('message', handler);
            reject(new Error(response.message));
            break;
        }
      };
      this.worker.addEventListener('message', handler);
      const request: ExportRequest = {
        type: 'zip',
        requestId,
        itemIds,
        presets,
        edge,
        activePresetId,
      };
      this.worker.postMessage(request);
    });
  }
}
