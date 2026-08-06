import { Download } from 'lucide-react';
import { useStudioStore } from '../state/store';
import { formatBytes, t } from '../state/i18n';
import { cancelModelDownload, retryModelDownload } from '../state/orchestrator';

export function ModelStatus() {
  const model = useStudioStore((s) => s.model);

  switch (model.phase) {
    case 'detecting':
      return (
        <div data-testid="model-status" data-phase="detecting" className="hidden" />
      );
    case 'ready':
      return (
        <div data-testid="model-status" data-phase="ready" className="hidden" />
      );
    case 'downloading': {
      const percent =
        model.totalBytes > 0
          ? Math.round((model.loadedBytes / model.totalBytes) * 100)
          : 0;
      return (
        <div
          data-testid="model-status"
          data-phase="downloading"
          className="flex min-w-0 items-center gap-2 text-xs text-zinc-600"
        >
          <div className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-zinc-200 sm:w-32">
            <div
              className="h-full rounded-full bg-blue-500 transition-[width]"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="min-w-0 truncate sm:hidden">{percent}%</span>
          <span className="hidden min-w-0 truncate sm:inline">
            {t.modelDownloading({
              loaded: formatBytes(model.loadedBytes),
              total: model.totalBytes > 0 ? formatBytes(model.totalBytes) : '…',
            })}
          </span>
          <button
            type="button"
            onClick={cancelModelDownload}
            className="shrink-0 cursor-pointer text-zinc-500 underline hover:text-zinc-700"
          >
            {t.modelCancel()}
          </button>
        </div>
      );
    }
    case 'verifying':
      return (
        <span data-testid="model-status" data-phase="verifying" className="text-xs text-zinc-600">
          {t.modelVerifying()}
        </span>
      );
    case 'creating':
      return (
        <span data-testid="model-status" data-phase="creating" className="text-xs text-zinc-600">
          {t.modelCreating()}
        </span>
      );
    case 'evicted':
      return (
        <div data-testid="model-status" data-phase="evicted" className="flex flex-wrap items-center gap-2 text-xs text-amber-700">
          <span>{t.modelEvicted()}</span>
          <button type="button" onClick={retryModelDownload} className="btn-secondary text-xs">
            <Download className="h-4 w-4" aria-hidden />
            {t.modelDownload()}
          </button>
        </div>
      );
    case 'canceled':
      return (
        <button
          type="button"
          data-testid="model-status"
          data-phase="canceled"
          onClick={retryModelDownload}
          className="btn-secondary text-xs"
        >
          <Download className="h-4 w-4" aria-hidden />
          {t.modelDownload()}
        </button>
      );
    case 'failed':
      return (
        <div data-testid="model-status" data-phase="failed" className="flex flex-wrap items-center gap-2 text-xs text-red-600">
          <span>{t.modelFailed()}</span>
          <button
            type="button"
            onClick={retryModelDownload}
            className="cursor-pointer rounded-(--radius-control) border border-red-300 px-2 py-0.5 font-medium hover:bg-red-50"
          >
            {t.modelRetry()}
          </button>
        </div>
      );
  }
}
