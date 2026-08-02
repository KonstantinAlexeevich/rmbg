import { useStudioStore } from '../state/store';
import { formatDuration, t } from '../state/i18n';
import { exportZip, newSession, stopProcessing } from '../state/orchestrator';

export function BottomBar({ onAddFiles }: { onAddFiles: () => void }) {
  const batch = useStudioStore((s) => s.batch);
  const exporting = useStudioStore((s) => s.exporting);
  const items = useStudioStore((s) => s.items);
  const settings = useStudioStore((s) => s.settings);
  const setExportPickerOpen = useStudioStore((s) => s.setExportPickerOpen);

  if (items.length === 0) return null;

  const selected = items.filter((i) => i.selected).length;
  const exportable = items.filter((i) => i.selected && i.status === 'done').length;
  const busy = batch.running || exporting.running;

  const onDownload = () => {
    if (settings.presets.length <= 1) {
      void exportZip();
      return;
    }
    setExportPickerOpen(true);
  };

  return (
    <footer className="flex items-center gap-3 border-t border-zinc-200 bg-white px-4 py-2">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {batch.running ? (
          <>
            <div className="h-1.5 w-40 shrink-0 overflow-hidden rounded-full bg-zinc-200">
              <div
                className="h-full rounded-full bg-blue-500 transition-[width]"
                style={{
                  width: `${batch.total > 0 ? (batch.done / batch.total) * 100 : 0}%`,
                }}
              />
            </div>
            <span className="truncate text-sm text-zinc-700">
              {t('progressProcessed', { done: batch.done, total: batch.total })}
              {batch.etaMs > 0 && `, ${t('progressEta', { eta: formatDuration(batch.etaMs) })}`}
            </span>
            <button
              type="button"
              onClick={stopProcessing}
              disabled={batch.stopRequested}
              className="shrink-0 rounded-lg border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
            >
              {t('progressStop')}
            </button>
          </>
        ) : exporting.running ? (
          <span className="truncate text-sm text-zinc-700">
            {t('exportPreparing', { done: exporting.done, total: exporting.total })}
          </span>
        ) : (
          <span className="truncate text-xs text-zinc-500">
            {t('selectedCount', { count: `${selected} / ${items.length}` })}
          </span>
        )}

        <button
          type="button"
          onClick={onAddFiles}
          className="shrink-0 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
        >
          {t('footerAddFiles')}
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => {
            if (window.confirm(t('confirmClear'))) {
              void newSession();
            }
          }}
          disabled={busy}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t('headerClear')}
        </button>
        <button
          type="button"
          onClick={onDownload}
          disabled={exportable === 0 || exporting.running}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t('headerDownloadZip')}
          {exportable > 0 ? ` (${exportable})` : ''}
        </button>
      </div>
    </footer>
  );
}
