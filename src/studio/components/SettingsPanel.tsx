import { activePreset } from '../../core/storage/settings';
import type { EdgeSettings, ItemOverride } from '../../core/types';
import { useStudioStore } from '../state/store';
import { t } from '../state/i18n';
import {
  exportZip,
  newSession,
  patchItemOverride,
  updateSettings,
} from '../state/orchestrator';
import { EdgeSection } from './settings/EdgeSection';
import { LayoutSection } from './settings/LayoutSection';
import { OverrideBanner } from './settings/OverrideBanner';
import { PresetsSection } from './settings/PresetsSection';

export function SettingsPanel() {
  const settings = useStudioStore((s) => s.settings);
  const settingsLoaded = useStudioStore((s) => s.settingsLoaded);
  const items = useStudioStore((s) => s.items);
  const compareItemId = useStudioStore((s) => s.compareItemId);
  const exporting = useStudioStore((s) => s.exporting);
  const setExportPickerOpen = useStudioStore((s) => s.setExportPickerOpen);

  if (!settingsLoaded) return <aside className="w-72 border-l border-zinc-200 bg-white" />;

  const preset = activePreset(settings);
  const compareItem = items.find((i) => i.id === compareItemId);
  const viewing = compareItemId !== '' && compareItem !== undefined;
  const itemOverride = viewing ? compareItem.override : null;
  const editingOverride = itemOverride !== null;

  // эффективные значения: слепок картинки или глобальные настройки
  const sizeMode = editingOverride ? itemOverride.sizeMode : preset.sizeMode;
  const canvas = editingOverride ? itemOverride.canvas : preset.canvas;
  const fit = editingOverride ? itemOverride.fit : preset.fit;
  const anchor = editingOverride ? itemOverride.anchor : preset.anchor;
  const background = editingOverride ? itemOverride.background : preset.background;
  const edge: EdgeSettings = editingOverride ? itemOverride.edge : settings.edge;

  const exportable = items.filter((i) => i.selected && i.status === 'done').length;

  const onDownload = () => {
    if (settings.presets.length <= 1) {
      void exportZip();
      return;
    }
    setExportPickerOpen(true);
  };

  // правки layout/edge идут в слепок, если он есть; иначе — в пресет/настройки
  const patchLayout = (mutate: (fields: ItemOverride) => Partial<ItemOverride>): void => {
    if (editingOverride && viewing) {
      void patchItemOverride(compareItemId, (o) => ({ ...o, ...mutate(o) }));
      return;
    }
    void updateSettings((s) => ({
      ...s,
      presets: s.presets.map((p) => {
        if (p.id !== s.activePresetId) return p;
        const patch = mutate({
          presetId: p.id,
          sizeMode: p.sizeMode,
          canvas: p.canvas,
          fit: p.fit,
          anchor: p.anchor,
          background: p.background,
          edge: s.edge,
        });
        return {
          ...p,
          ...(patch.sizeMode !== undefined ? { sizeMode: patch.sizeMode } : {}),
          ...(patch.canvas !== undefined ? { canvas: patch.canvas } : {}),
          ...(patch.fit !== undefined ? { fit: patch.fit } : {}),
          ...(patch.anchor !== undefined ? { anchor: patch.anchor } : {}),
          ...(patch.background !== undefined ? { background: patch.background } : {}),
        };
      }),
    }));
  };

  const patchEdge = (patch: Partial<EdgeSettings>): void => {
    if (editingOverride && viewing) {
      void patchItemOverride(compareItemId, (o) => ({
        ...o,
        edge: { ...o.edge, ...patch },
      }));
      return;
    }
    void updateSettings((s) => ({ ...s, edge: { ...s.edge, ...patch } }));
  };

  return (
    <aside className="flex w-72 shrink-0 flex-col border-l border-zinc-200 bg-white">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {viewing && (
          <OverrideBanner
            itemId={compareItemId}
            itemName={compareItem.name}
            editingOverride={editingOverride}
          />
        )}

        <EdgeSection
          edge={edge}
          highlighted={editingOverride}
          onPatch={patchEdge}
        />

        <PresetsSection settings={settings} />

        <LayoutSection
          preset={preset}
          sizeMode={sizeMode}
          canvas={canvas}
          fit={fit}
          anchor={anchor}
          background={background}
          editingOverride={editingOverride}
          highlighted={editingOverride}
          patchLayout={patchLayout}
        />
      </div>

      <div className="flex shrink-0 flex-col gap-2 border-t border-zinc-200 p-4">
        <button
          type="button"
          onClick={onDownload}
          disabled={exportable === 0 || exporting.running}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t('headerDownloadZip')}
          {exportable > 0 ? ` (${exportable})` : ''}
        </button>
        <button
          type="button"
          onClick={() => {
            if (items.length === 0 || window.confirm(t('confirmClear'))) {
              void newSession();
            }
          }}
          className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
        >
          {t('headerClear')}
        </button>
      </div>
    </aside>
  );
}
