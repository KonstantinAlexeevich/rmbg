import { useStudioStore } from '../state/store';
import { formatDuration, t } from '../state/i18n';
import { stopProcessing } from '../state/orchestrator';

export function BottomBar() {
  const batch = useStudioStore((s) => s.batch);
  const exporting = useStudioStore((s) => s.exporting);
  const items = useStudioStore((s) => s.items);

  const selected = items.filter((i) => i.selected).length;

  if (!batch.running && !exporting.running) {
    if (items.length === 0) return null;
    return (
      <footer className="border-t border-zinc-200 bg-white px-4 py-2 text-xs text-zinc-500">
        {t('selectedCount', { count: `${selected} / ${items.length}` })}
      </footer>
    );
  }

  return (
    <footer className="flex items-center gap-4 border-t border-zinc-200 bg-white px-4 py-2.5">
      {batch.running && (
        <>
          <div className="h-1.5 w-48 overflow-hidden rounded-full bg-zinc-200">
            <div
              className="h-full rounded-full bg-blue-500 transition-[width]"
              style={{
                width: `${batch.total > 0 ? (batch.done / batch.total) * 100 : 0}%`,
              }}
            />
          </div>
          <span className="text-sm text-zinc-700">
            {t('progressProcessed', { done: batch.done, total: batch.total })}
            {batch.etaMs > 0 && `, ${t('progressEta', { eta: formatDuration(batch.etaMs) })}`}
          </span>
          <button
            type="button"
            onClick={stopProcessing}
            disabled={batch.stopRequested}
            className="rounded-lg border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
          >
            {t('progressStop')}
          </button>
        </>
      )}
      {exporting.running && (
        <span className="text-sm text-zinc-700">
          {t('exportPreparing', { done: exporting.done, total: exporting.total })}
        </span>
      )}
    </footer>
  );
}
