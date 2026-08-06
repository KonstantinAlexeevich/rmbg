import { X } from 'lucide-react';
import { activePreset } from '../../core/storage/settings';
import type { EdgeSettings, ItemOverride } from '../../core/types';
import { aboutPageUrl } from '../../platform/studio-url';
import { useStudioStore } from '../state/store';
import { t } from '../state/i18n';
import { patchItemOverride, updateSettings } from '../state/orchestrator';
import { EdgeSection } from './settings/EdgeSection';
import { OverrideBanner } from './settings/OverrideBanner';
import { PresetsSection } from './settings/PresetsSection';

export function SettingsPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const settings = useStudioStore((s) => s.settings);
  const settingsLoaded = useStudioStore((s) => s.settingsLoaded);
  const items = useStudioStore((s) => s.items);
  const compareItemId = useStudioStore((s) => s.compareItemId);

  const shellClass = [
    'flex flex-col border-zinc-200 bg-white',
    open
      ? 'fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] rounded-t-2xl border-t shadow-xl'
      : 'hidden',
    // на md+ панель всегда в раскладке справа, независимо от sheet-состояния
    'md:relative md:inset-auto md:z-auto md:flex md:h-full md:max-h-none md:w-72 md:shrink-0 md:rounded-none md:border-t-0 md:border-l md:shadow-none',
  ].join(' ');

  if (!settingsLoaded) {
    return (
      <>
        {open && (
          <div
            className="fixed inset-0 z-40 bg-zinc-950/40 md:hidden"
            aria-hidden
            onClick={onClose}
          />
        )}
        <aside className={shellClass} />
      </>
    );
  }

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
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-zinc-950/40 md:hidden"
          aria-hidden
          onClick={onClose}
        />
      )}
      <aside className={shellClass} aria-label={t.settingsTitle()}>
        <div className="flex shrink-0 flex-col border-b border-zinc-200 md:hidden">
          <div className="flex justify-center pt-2.5 pb-1" aria-hidden>
            <div className="h-1 w-10 rounded-full bg-zinc-300" />
          </div>
          <div className="flex items-center justify-between gap-3 px-4 pb-3">
            <h2 className="text-sm font-semibold text-zinc-900">{t.settingsTitle()}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={t.close()}
              className="btn-icon shrink-0"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
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
        <div className="flex h-12 shrink-0 items-center justify-center border-t border-zinc-200 bg-white px-4 pb-[env(safe-area-inset-bottom)] md:pb-0">
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
    </>
  );
}
