import { useStudioStore } from '../state/store';
import { t } from '../state/i18n';
import { clearAllData, setBackendOverride } from '../state/orchestrator';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-zinc-100 py-1.5 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className="truncate text-right text-zinc-800" title={value}>
        {value !== '' ? value : '—'}
      </span>
    </div>
  );
}

function modelPhaseText(phase: string): string {
  switch (phase) {
    case 'ready':
      return 'готова';
    case 'downloading':
      return 'качается';
    case 'creating':
      return 'инициализация';
    case 'failed':
      return 'ошибка';
    case 'evicted':
      return 'вытеснена из кэша';
    default:
      return phase;
  }
}

export function DiagnosticsPanel() {
  const open = useStudioStore((s) => s.diagnosticsOpen);
  const setOpen = useStudioStore((s) => s.setDiagnosticsOpen);
  const backend = useStudioStore((s) => s.backend);
  const model = useStudioStore((s) => s.model);
  const diag = useStudioStore((s) => s.diagnostics);
  const settings = useStudioStore((s) => s.settings);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-zinc-950/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <h2 className="mb-3 text-base font-semibold text-zinc-900">{t('diagTitle')}</h2>

        <Row label={t('diagBackend')} value={backend} />
        <Row label={t('diagFallbackReason')} value={diag.fallbackReason} />
        <Row label={t('diagAdapter')} value={diag.adapterName} />
        <Row label={t('diagIsolated')} value={String(diag.crossOriginIsolated)} />
        <Row label={t('diagThreads')} value={String(diag.wasmThreads)} />
        <Row label={t('diagModelState')} value={modelPhaseText(model.phase)} />
        <Row label={t('diagModelUrl')} value={diag.modelUrl} />
        <Row
          label={t('diagModelLoadMs')}
          value={diag.downloadMs > 0 ? `${diag.downloadMs} мс` : ''}
        />
        <Row label={t('diagWarmupMs')} value={diag.warmupMs > 0 ? `${diag.warmupMs} мс` : ''} />
        <Row label={t('diagLastRunMs')} value={diag.lastRunMs > 0 ? `${diag.lastRunMs} мс` : ''} />

        <label className="mt-4 flex flex-col gap-1 text-sm text-zinc-700">
          {t('diagBackendOverride')}
          <select
            value={settings.backendOverride}
            onChange={(e) =>
              void setBackendOverride(e.target.value as 'auto' | 'webgpu' | 'wasm')
            }
            className="rounded-md border border-zinc-300 px-2 py-1 text-sm"
          >
            <option value="auto">auto</option>
            <option value="webgpu">webgpu</option>
            <option value="wasm">wasm</option>
          </select>
        </label>

        <div className="mt-5 flex justify-between">
          <button
            type="button"
            onClick={() => {
              if (window.confirm(t('confirmNewSession'))) void clearAllData();
            }}
            className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
          >
            {t('diagClearAll')}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm text-white hover:bg-zinc-700"
          >
            {t('diagClose')}
          </button>
        </div>
      </div>
    </div>
  );
}
