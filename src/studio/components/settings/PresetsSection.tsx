import { Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  activePreset,
  addPreset,
  removePreset,
  setActivePresetId,
  type Settings,
} from '../../../core/storage/settings';
import type { Preset } from '../../../core/preset/types';
import type { ItemOverride } from '../../../core/types';
import { t } from '../../state/i18n';
import { purgeOverridesForPreset, updateSettings } from '../../state/orchestrator';
import { Section } from '../controls';
import { LayoutSection } from './LayoutSection';

export function PresetsSection({
  settings,
  preset,
  sizeMode,
  canvas,
  fit,
  anchor,
  background,
  patchLayout,
  editingOverride = false,
}: {
  settings: Settings;
  preset: Preset;
  sizeMode: Preset['sizeMode'];
  canvas: Preset['canvas'];
  fit: Preset['fit'];
  anchor: Preset['anchor'];
  background: Preset['background'];
  patchLayout: (mutate: (fields: ItemOverride) => Partial<ItemOverride>) => void;
  editingOverride?: boolean;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const canDelete = settings.presets.length > 1;
  // со слепком поля всегда видны — править их и есть смысл просмотра
  const panelOpen = editingOverride || settingsOpen;

  useEffect(() => {
    if (!editingOverride) setSettingsOpen(false);
  }, [settings.activePresetId, editingOverride]);

  return (
    <Section title={t('outputsTitle')} highlighted={editingOverride}>
      <div className="flex flex-col gap-4">
        <ul className="-mx-3.5 -mr-4 flex flex-col border-y border-zinc-200">
          {settings.presets.map((p, index) => {
            const isActive = p.id === settings.activePresetId;
            return (
              <li
                key={p.id}
                className={index > 0 ? 'border-t border-zinc-200' : undefined}
              >
                <div
                  className={`flex items-center gap-1.5 pr-2 ${
                    isActive ? 'bg-zinc-100' : 'bg-white hover:bg-zinc-50'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => void updateSettings((s) => setActivePresetId(s, p.id))}
                    aria-current={isActive ? 'true' : undefined}
                    className={`min-w-0 flex-1 cursor-pointer truncate px-3.5 py-2 text-left text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                      isActive
                        ? 'font-medium text-zinc-900'
                        : 'text-zinc-600 hover:text-zinc-800'
                    }`}
                  >
                    {p.name}
                  </button>
                  {isActive && (
                    <div className="flex shrink-0 overflow-hidden rounded-(--radius-control) border border-zinc-300 bg-white">
                      <button
                        type="button"
                        onClick={() => {
                          if (editingOverride) return;
                          setSettingsOpen((v) => !v);
                        }}
                        aria-expanded={panelOpen}
                        aria-label={t('outputSettings')}
                        title={t('outputSettings')}
                        className={`border-r border-zinc-300 p-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                          panelOpen
                            ? `bg-zinc-100 text-zinc-800 ${editingOverride ? 'cursor-default' : 'cursor-pointer'}`
                            : 'cursor-pointer text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800'
                        }`}
                      >
                        <SlidersHorizontal className="h-4 w-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        disabled={!canDelete}
                        onClick={() => {
                          const id = settings.activePresetId;
                          void updateSettings((s) => removePreset(s, id)).then(() =>
                            purgeOverridesForPreset(id),
                          );
                        }}
                        aria-label={t('outputDelete')}
                        title={t('outputDelete')}
                        className="btn-icon disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  )}
                </div>
                {isActive && panelOpen && (
                  <div className="border-t border-zinc-200 bg-zinc-50 px-3.5 py-2.5 pr-4">
                    <LayoutSection
                      preset={preset}
                      sizeMode={sizeMode}
                      canvas={canvas}
                      fit={fit}
                      anchor={anchor}
                      background={background}
                      editingOverride={editingOverride}
                      patchLayout={patchLayout}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={() =>
            void updateSettings((s) => {
              const source = activePreset(s);
              return addPreset(s, t('outputCopySuffix', { name: source.name }));
            })
          }
          className="btn-secondary w-full"
        >
          <Plus className="h-4 w-4" aria-hidden />
          {t('outputAdd')}
        </button>
      </div>
    </Section>
  );
}
