import { useStudioStore } from '../state/store';
import { t } from '../state/i18n';
import { exportZip, newSession, processAll } from '../state/orchestrator';
import { ModelStatus } from './ModelStatus';

export function Header() {
  const backend = useStudioStore((s) => s.backend);
  const model = useStudioStore((s) => s.model);
  const items = useStudioStore((s) => s.items);
  const batch = useStudioStore((s) => s.batch);
  const exporting = useStudioStore((s) => s.exporting);
  const processRequested = useStudioStore((s) => s.processRequested);
  const setDiagnosticsOpen = useStudioStore((s) => s.setDiagnosticsOpen);

  const exportable = items.filter((i) => i.selected && i.status === 'done').length;
  const pending = items.filter(
    (i) => i.status === 'queued' || i.status === 'failed' || i.stale,
  ).length;

  const processLabel =
    processRequested && model.phase !== 'ready'
      ? model.phase === 'creating'
        ? t('modelPreparing')
        : t('modelWaiting')
      : t('headerProcess');

  return (
    <header className="flex items-center gap-3 border-b border-zinc-200 bg-white px-4 py-2.5 shadow-sm">
      <span className="text-lg font-bold tracking-tight text-zinc-900">
        {t('appName')}
      </span>

      <button
        type="button"
        onClick={() => setDiagnosticsOpen(true)}
        title={t('diagTitle')}
        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
          backend === 'webgpu'
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-amber-100 text-amber-700'
        }`}
      >
        {backend === 'webgpu' ? t('badgeGpu') : t('badgeCpu')}
      </button>

      <ModelStatus />

      <div className="flex-1" />

      <button
        type="button"
        onClick={() => {
          if (items.length === 0 || window.confirm(t('confirmNewSession'))) {
            void newSession();
          }
        }}
        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
      >
        {t('headerNewSession')}
      </button>

      <button
        type="button"
        onClick={() => void processAll()}
        disabled={pending === 0 || batch.running}
        className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {processLabel}
        {pending > 0 ? ` (${pending})` : ''}
      </button>

      <button
        type="button"
        onClick={() => void exportZip()}
        disabled={exportable === 0 || exporting.running}
        className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {t('headerDownloadZip')}
        {exportable > 0 ? ` (${exportable})` : ''}
      </button>
    </header>
  );
}
