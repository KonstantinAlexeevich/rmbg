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
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <h2 className="mb-3 text-base font-semibold text-zinc-900">
          {t('exportPickerTitle')}
        </h2>

        <ul className="flex flex-col gap-1.5">
          {settings.presets.map((p) => {
            const checked = settings.exportPresetIds.includes(p.id);
            return (
              <li key={p.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-zinc-50">
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
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            {t('exportPickerCancel')}
          </button>
          <button
            type="button"
            disabled={selectedCount === 0 || exporting.running}
            onClick={() => {
              setOpen(false);
              void exportZip();
            }}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t('exportPickerConfirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
