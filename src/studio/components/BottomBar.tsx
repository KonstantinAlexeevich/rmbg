import { CircleStop, FileArchive, ImagePlus } from 'lucide-react';
import { useState } from 'react';
import { useStudioStore } from '../state/store';
import { formatDuration, t } from '../state/i18n';
import { exportZip, newSession, stopProcessing } from '../state/orchestrator';
import { ConfirmDialog } from './ConfirmDialog';

export function BottomBar({ onAddFiles }: { onAddFiles: () => void }) {
  const batch = useStudioStore((s) => s.batch);
  const exporting = useStudioStore((s) => s.exporting);
  const allItems = useStudioStore((s) => s.items);
  const items = allItems.filter((i) => !i.ephemeral);
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
      <footer className="flex shrink-0 flex-col gap-2 border-t border-zinc-200 bg-white px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:gap-3 sm:px-4 sm:py-0 sm:h-12 sm:pb-0">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          {batch.running ? (
            <>
              <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-zinc-200 sm:w-40 sm:flex-none">
                <div
                  className="h-full rounded-full bg-blue-500 transition-[width]"
                  style={{
                    width: `${batch.total > 0 ? (batch.done / batch.total) * 100 : 0}%`,
                  }}
                />
              </div>
              <span className="min-w-0 truncate text-sm text-zinc-700">
                {t.progressProcessed({ done: batch.done, total: batch.total })}
                {batch.etaMs > 0 &&
                  `, ${t.progressEta({ eta: formatDuration(batch.etaMs) })}`}
              </span>
              <button
                type="button"
                onClick={stopProcessing}
                disabled={batch.stopRequested}
                title={t.progressStopHint()}
                className="btn-secondary shrink-0"
              >
                <CircleStop className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">{t.progressStop()}</span>
              </button>
            </>
          ) : exporting.running ? (
            <span className="truncate text-sm text-zinc-700">
              {t.exportPreparing({ done: exporting.done, total: exporting.total })}
            </span>
          ) : (
            <span className="truncate text-xs text-zinc-500">
              {t.selectedCount({ selected, total: items.length })}
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 sm:flex sm:shrink-0 sm:items-center">
          <button type="button" onClick={onAddFiles} className="btn-secondary min-w-0">
            <ImagePlus className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">{t.addImages()}</span>
          </button>
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            disabled={busy}
            className="btn-secondary min-w-0"
          >
            <span className="truncate">{t.sessionClear()}</span>
          </button>
          <button
            type="button"
            data-testid="export-zip"
            onClick={onDownload}
            disabled={exportable === 0 || exporting.running}
            className="btn-primary min-w-0"
          >
            <FileArchive className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">
              {t.exportZip()}
              {exportable > 0 ? ` (${exportable})` : ''}
            </span>
          </button>
        </div>
      </footer>

      <ConfirmDialog
        open={confirmClear}
        message={t.confirmClearSession()}
        confirmLabel={t.sessionClear()}
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
