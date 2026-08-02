import { useEffect, useState } from 'react';
import {
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

const PENCIL_ICON =
  'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z';

const TRASH_ICON =
  'M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z';

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
    <Section title={t('settingsPresets')} highlighted={editingOverride}>
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
                    className={`min-w-0 flex-1 cursor-pointer truncate px-3.5 py-2 text-left text-sm ${
                      isActive
                        ? 'font-medium text-zinc-900'
                        : 'text-zinc-600 hover:text-zinc-800'
                    }`}
                    title={t('settingsPresetActive')}
                  >
                    {p.name}
                  </button>
                  {isActive && (
                    <div className="flex shrink-0 overflow-hidden rounded-md border border-zinc-300 bg-white">
                      <button
                        type="button"
                        onClick={() => {
                          if (editingOverride) return;
                          setSettingsOpen((v) => !v);
                        }}
                        aria-expanded={panelOpen}
                        aria-label={t('settingsPresetSettings')}
                        title={t('settingsPresetSettings')}
                        className={`border-r border-zinc-300 p-1.5 ${
                          panelOpen
                            ? `bg-zinc-100 text-zinc-800 ${editingOverride ? 'cursor-default' : 'cursor-pointer'}`
                            : 'cursor-pointer text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800'
                        }`}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="h-3.5 w-3.5 fill-current"
                          aria-hidden
                        >
                          <path d={PENCIL_ICON} />
                        </svg>
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
                        aria-label={t('settingsPresetDelete')}
                        title={t('settingsPresetDelete')}
                        className="cursor-pointer p-1.5 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="h-3.5 w-3.5 fill-current"
                          aria-hidden
                        >
                          <path d={TRASH_ICON} />
                        </svg>
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
          onClick={() => void updateSettings((s) => addPreset(s))}
          className="w-full cursor-pointer rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
        >
          {t('settingsPresetAdd')}
        </button>
      </div>
    </Section>
  );
}
