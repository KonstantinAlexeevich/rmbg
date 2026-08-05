import { Download } from 'lucide-react';
import { useStudioStore } from '../state/store';
import { formatBytes, t } from '../state/i18n';
import { cancelModelDownload, retryModelDownload } from '../state/orchestrator';

export function ModelStatus() {
  const model = useStudioStore((s) => s.model);

  switch (model.phase) {
    case 'detecting':
      return null;
    case 'ready':
      return null; // готова — индикатор скрывается
    case 'downloading': {
      const percent =
        model.totalBytes > 0
          ? Math.round((model.loadedBytes / model.totalBytes) * 100)
          : 0;
      return (
        <div className="flex items-center gap-2 text-xs text-zinc-600">
          <div className="h-1.5 w-32 overflow-hidden rounded-full bg-zinc-200">
            <div
              className="h-full rounded-full bg-blue-500 transition-[width]"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span>
            {t.modelDownloading({
              loaded: formatBytes(model.loadedBytes),
              total: model.totalBytes > 0 ? formatBytes(model.totalBytes) : '…',
            })}
          </span>
          <button
            type="button"
            onClick={cancelModelDownload}
            className="cursor-pointer text-zinc-500 underline hover:text-zinc-700"
          >
            {t.modelCancel()}
          </button>
        </div>
      );
    }
    case 'verifying':
      return <span className="text-xs text-zinc-600">{t.modelVerifying()}</span>;
    case 'creating':
      return <span className="text-xs text-zinc-600">{t.modelCreating()}</span>;
    case 'evicted':
      return (
        <div className="flex items-center gap-2 text-xs text-amber-700">
          <span>{t.modelEvicted()}</span>
          <button type="button" onClick={retryModelDownload} className="btn-secondary text-xs">
            <Download className="h-4 w-4" aria-hidden />
            {t.modelDownload()}
          </button>
        </div>
      );
    case 'canceled':
      return (
        <button type="button" onClick={retryModelDownload} className="btn-secondary text-xs">
          <Download className="h-4 w-4" aria-hidden />
          {t.modelDownload()}
        </button>
      );
    case 'failed':
      return (
        <div className="flex items-center gap-2 text-xs text-red-600">
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
