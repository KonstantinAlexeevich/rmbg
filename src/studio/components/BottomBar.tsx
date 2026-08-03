import { CircleStop, FileArchive, ImagePlus } from 'lucide-react';
import { useState } from 'react';
import { useStudioStore } from '../state/store';
import { formatDuration, t } from '../state/i18n';
import { exportZip, newSession, stopProcessing } from '../state/orchestrator';
import { ConfirmDialog } from './ConfirmDialog';

export function BottomBar({ onAddFiles }: { onAddFiles: () => void }) {
  const batch = useStudioStore((s) => s.batch);
  const exporting = useStudioStore((s) => s.exporting);
  const items = useStudioStore((s) => s.items);
  const settings = useStudioStore((s) => s.settings);
  const setExportPickerOpen = useStudioStore((s) => s.setExportPickerOpen);
  const [confirmClear, setConfirmClear] = useState(false);

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
    <>
      <footer className="relative flex items-center gap-3 border-t border-zinc-200 bg-white px-4 py-2">
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
                {batch.etaMs > 0 &&
                  `, ${t('progressEta', { eta: formatDuration(batch.etaMs) })}`}
              </span>
              <button
                type="button"
                onClick={stopProcessing}
                disabled={batch.stopRequested}
                title={t('progressStopHint')}
                className="btn-secondary shrink-0"
              >
                <CircleStop className="h-4 w-4" aria-hidden />
                {t('progressStop')}
              </button>
            </>
          ) : exporting.running ? (
            <span className="truncate text-sm text-zinc-700">
              {t('exportPreparing', { done: exporting.done, total: exporting.total })}
            </span>
          ) : (
            <span className="truncate text-xs text-zinc-500">
              {t('selectedCount', { selected, total: items.length })}
            </span>
          )}

          <button type="button" onClick={onAddFiles} className="btn-secondary shrink-0">
            <ImagePlus className="h-4 w-4" aria-hidden />
            {t('addImages')}
          </button>
        </div>

        <a
          href={chrome.runtime.getURL('about.html')}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute left-1/2 -translate-x-1/2 text-xs text-zinc-400 hover:text-zinc-600 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          {t('aboutLinkLabel')}
        </a>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            disabled={busy}
            className="btn-secondary"
          >
            {t('sessionClear')}
          </button>
          <button
            type="button"
            onClick={onDownload}
            disabled={exportable === 0 || exporting.running}
            className="btn-primary"
          >
            <FileArchive className="h-4 w-4" aria-hidden />
            {t('exportZip')}
            {exportable > 0 ? ` (${exportable})` : ''}
          </button>
        </div>
      </footer>

      <ConfirmDialog
        open={confirmClear}
        message={t('confirmClearSession')}
        confirmLabel={t('sessionClear')}
        danger
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          setConfirmClear(false);
          void newSession();
        }}
      />
    </>
  );
}
