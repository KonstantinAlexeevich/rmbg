import { useState } from 'react';
import { useStudioStore } from '../state/store';
import { t, type MessageKey } from '../state/i18n';
import { clearAllData, setBackendOverride } from '../state/orchestrator';
import { ConfirmDialog } from './ConfirmDialog';

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
  const keys: Record<string, MessageKey> = {
    ready: 'diagPhaseReady',
    downloading: 'diagPhaseDownloading',
    verifying: 'diagPhaseVerifying',
    creating: 'diagPhaseCreating',
    failed: 'diagPhaseFailed',
    evicted: 'diagPhaseEvicted',
    canceled: 'diagPhaseCanceled',
    detecting: 'diagPhaseDetecting',
  };
  const key = keys[phase];
  return key !== undefined ? t[key]() : phase;
}

export function DiagnosticsPanel() {
  const open = useStudioStore((s) => s.diagnosticsOpen);
  const setOpen = useStudioStore((s) => s.setDiagnosticsOpen);
  const backend = useStudioStore((s) => s.backend);
  const model = useStudioStore((s) => s.model);
  const diag = useStudioStore((s) => s.diagnostics);
  const settings = useStudioStore((s) => s.settings);
  const [confirmErase, setConfirmErase] = useState(false);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 flex items-center justify-center bg-zinc-950/50 p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
      >
        <div className="surface max-h-[min(36rem,calc(100dvh-2rem))] w-full max-w-md overflow-y-auto overscroll-contain p-5">
          <h2 className="mb-3 text-base font-semibold text-zinc-900">{t.diagTitle()}</h2>

          <Row
            label={t.diagBackend()}
            value={backend === 'webgpu' ? t.diagBackendWebgpu() : t.diagBackendWasm()}
          />
          <Row label={t.diagFallbackReason()} value={diag.fallbackReason} />
          <Row label={t.diagAdapter()} value={diag.adapterName} />
          <Row
            label={t.diagIsolated()}
            value={diag.crossOriginIsolated ? t.diagYes() : t.diagNo()}
          />
          <Row
            label={t.diagThreads()}
            value={diag.wasmThreads ? t.diagYes() : t.diagNo()}
          />
          <Row label={t.diagModelState()} value={modelPhaseText(model.phase)} />
          <Row label={t.diagModelUrl()} value={diag.modelUrl} />
          <Row
            label={t.diagModelLoadMs()}
            value={diag.downloadMs > 0 ? t.unitMs({ value: diag.downloadMs }) : ''}
          />
          <Row
            label={t.diagWarmupMs()}
            value={diag.warmupMs > 0 ? t.unitMs({ value: diag.warmupMs }) : ''}
          />
          <Row
            label={t.diagLastRunMs()}
            value={diag.lastRunMs > 0 ? t.unitMs({ value: diag.lastRunMs }) : ''}
          />

          <label className="mt-4 flex flex-col gap-1 text-sm text-zinc-700">
            {t.diagBackendOverride()}
            <select
              value={settings.backendOverride}
              onChange={(e) =>
                void setBackendOverride(e.target.value as 'auto' | 'webgpu' | 'wasm')
              }
              className="field"
            >
              <option value="auto">auto</option>
              <option value="webgpu">webgpu</option>
              <option value="wasm">wasm</option>
            </select>
            <span className="text-xs text-zinc-500">{t.diagBackendOverrideHint()}</span>
          </label>

          <div className="mt-5 flex justify-between">
            <button
              type="button"
              onClick={() => setConfirmErase(true)}
              className="rounded-(--radius-control) border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              {t.diagClearAll()}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
              {t.diagClose()}
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmErase}
        message={t.confirmEraseAll()}
        confirmLabel={t.diagClearAll()}
        danger
        onCancel={() => setConfirmErase(false)}
        onConfirm={() => {
          setConfirmErase(false);
          void clearAllData();
        }}
      />
    </>
  );
}
