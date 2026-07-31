import {
  addPreset,
  removePreset,
  setActivePresetId,
  type Settings,
} from '../../../core/storage/settings';
import { t } from '../../state/i18n';
import { purgeOverridesForPreset, updateSettings } from '../../state/orchestrator';
import { Section } from '../controls';

export function PresetsSection({ settings }: { settings: Settings }) {
  return (
    <Section title={t('settingsPresets')}>
      <ul className="flex flex-col gap-1.5">
        {settings.presets.map((p) => {
          const isActive = p.id === settings.activePresetId;
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => void updateSettings((s) => setActivePresetId(s, p.id))}
                className={`w-full truncate rounded-md px-2 py-1.5 text-left text-sm text-zinc-800 ${
                  isActive ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-zinc-50'
                }`}
                title={t('settingsPresetActive')}
              >
                {p.name}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void updateSettings((s) => addPreset(s))}
          className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
        >
          {t('settingsPresetAdd')}
        </button>
        <button
          type="button"
          disabled={settings.presets.length <= 1}
          onClick={() => {
            const id = settings.activePresetId;
            void updateSettings((s) => removePreset(s, id)).then(() =>
              purgeOverridesForPreset(id),
            );
          }}
          className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
        >
          {t('settingsPresetDelete')}
        </button>
      </div>
    </Section>
  );
}
