import { activePreset } from '../../core/storage/settings';
import type { EdgeSettings, ItemOverride } from '../../core/types';
import { aboutPageUrl } from '../../platform/studio-url';
import { useStudioStore } from '../state/store';
import { t } from '../state/i18n';
import { patchItemOverride, updateSettings } from '../state/orchestrator';
import { EdgeSection } from './settings/EdgeSection';
import { OverrideBanner } from './settings/OverrideBanner';
import { PresetsSection } from './settings/PresetsSection';

export function SettingsPanel() {
  const settings = useStudioStore((s) => s.settings);
  const settingsLoaded = useStudioStore((s) => s.settingsLoaded);
  const items = useStudioStore((s) => s.items);
  const compareItemId = useStudioStore((s) => s.compareItemId);

  if (!settingsLoaded)
    return <aside className="flex w-72 shrink-0 flex-col border-l border-zinc-200 bg-white" />;

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

  // правки layout/edge идут в слепок, если он есть; иначе — в пресет/настройки
  const patchLayout = (mutate: (fields: ItemOverride) => Partial<ItemOverride>): void => {
    if (editingOverride && viewing) {
      void patchItemOverride(compareItemId, (o) => {
        const patch = mutate(o);
        return {
          ...o,
          ...patch,
          // Глубокое копирование fit/canvas: иначе allowZoom/margin
          // могут остаться на старых ссылках из IndexedDB-снимка.
          canvas: patch.canvas !== undefined ? { ...patch.canvas } : { ...o.canvas },
          fit:
            patch.fit !== undefined
              ? {
                  ...patch.fit,
                  margin: { ...patch.fit.margin },
                  allowZoom: patch.fit.allowZoom === true,
                }
              : {
                  ...o.fit,
                  margin: { ...o.fit.margin },
                  allowZoom: o.fit.allowZoom === true,
                },
          background:
            patch.background !== undefined
              ? patch.background.kind === 'solid'
                ? { kind: 'solid', color: patch.background.color }
                : { kind: 'transparent' }
              : o.background.kind === 'solid'
                ? { kind: 'solid', color: o.background.color }
                : { kind: 'transparent' },
          edge: patch.edge !== undefined ? { ...patch.edge } : { ...o.edge },
        };
      });
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
          ...(patch.canvas !== undefined ? { canvas: { ...patch.canvas } } : {}),
          ...(patch.fit !== undefined
            ? {
                fit: {
                  ...patch.fit,
                  margin: { ...patch.fit.margin },
                  allowZoom: patch.fit.allowZoom === true,
                },
              }
            : {}),
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
      <div className="flex-1 overflow-y-auto">
        {viewing && (
          <OverrideBanner
            itemId={compareItemId}
            itemName={compareItem.name}
            presetName={preset.name}
            editingOverride={editingOverride}
          />
        )}
        <EdgeSection
          edge={edge}
          highlighted={editingOverride}
          sharedNote={!editingOverride}
          onPatch={patchEdge}
        />
        <PresetsSection
          settings={settings}
          preset={preset}
          sizeMode={sizeMode}
          canvas={canvas}
          fit={fit}
          anchor={anchor}
          background={background}
          patchLayout={patchLayout}
          editingOverride={editingOverride}
        />
      </div>
      <div className="flex h-12 shrink-0 items-center justify-center border-t border-zinc-200 bg-white px-4">
        <a
          href={aboutPageUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-zinc-400 hover:text-zinc-600 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          {t.aboutLinkLabel()}
        </a>
      </div>
    </aside>
  );
}
