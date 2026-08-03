import { toggleExportPresetId } from '../../core/storage/settings';
import { useStudioStore } from '../state/store';
import { t } from '../state/i18n';
import { exportZip, updateSettings } from '../state/orchestrator';

export function ExportPresetsModal() {
  const open = useStudioStore((s) => s.exportPickerOpen);
  const setOpen = useStudioStore((s) => s.setExportPickerOpen);
  const settings = useStudioStore((s) => s.settings);
  const exporting = useStudioStore((s) => s.exporting);

  if (!open) return null;

  const selectedCount = settings.exportPresetIds.filter((id) =>
    settings.presets.some((p) => p.id === id),
  ).length;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-zinc-950/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="surface w-full max-w-sm p-5">
        <h2 className="mb-1 text-base font-semibold text-zinc-900">
          {t('exportPickerTitle')}
        </h2>
        <p className="mb-3 text-xs text-zinc-500">{t('exportPickerHint')}</p>

        <ul className="flex flex-col gap-1.5">
          {settings.presets.map((p) => {
            const checked = settings.exportPresetIds.includes(p.id);
            return (
              <li key={p.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded-(--radius-control) px-2 py-1.5 hover:bg-zinc-50">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => void updateSettings((s) => toggleExportPresetId(s, p.id))}
                    className="accent-blue-600"
                  />
                  <span className="truncate text-sm text-zinc-800">{p.name}</span>
                </label>
              </li>
            );
          })}
        </ul>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
            {t('exportPickerCancel')}
          </button>
          <button
            type="button"
            disabled={selectedCount === 0 || exporting.running}
            onClick={() => {
              setOpen(false);
              void exportZip();
            }}
            className="btn-primary"
          >
            {t('exportPickerConfirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
