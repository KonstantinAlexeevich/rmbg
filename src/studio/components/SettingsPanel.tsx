import { useState } from 'react';
import { activePreset } from '../../core/storage/settings';
import type { Preset } from '../../core/preset/types';
import { useStudioStore } from '../state/store';
import { t } from '../state/i18n';
import { resetEdgeSettings, updateSettings } from '../state/orchestrator';

const SWATCHES = ['#ffffff', '#f4f4f5', '#000000'];

function patchPreset(patch: (preset: Preset) => Preset): void {
  void updateSettings((s) => ({
    ...s,
    presets: s.presets.map((p) => (p.id === s.activePresetId ? patch(p) : p)),
  }));
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5 border-b border-zinc-200 px-4 py-4">
      <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-zinc-700">
      <span className="flex justify-between">
        {label}
        <span className="tabular-nums text-zinc-400">{value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-blue-600"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  // Черновик пока поле в фокусе: иначе промежуточный ввод затирается
  // контролируемым value / clamp'ом.
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? String(value);

  const commit = (raw: string) => {
    setDraft(null);
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    let next = Math.round(parsed);
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    if (next !== value) onChange(next);
  };

  return (
    <label className="flex flex-col gap-1 text-sm text-zinc-700">
      {label}
      <input
        type="number"
        min={min}
        max={max}
        value={shown}
        onFocus={() => setDraft(String(value))}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => commit(draft ?? String(value))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        className="rounded-md border border-zinc-300 px-2 py-1 text-sm"
      />
    </label>
  );
}

export function SettingsPanel() {
  const settings = useStudioStore((s) => s.settings);
  const settingsLoaded = useStudioStore((s) => s.settingsLoaded);
  const [linkedMargins, setLinkedMargins] = useState(true);

  if (!settingsLoaded) return <aside className="w-72 border-l border-zinc-200 bg-white" />;

  const preset = activePreset(settings);
  const { edge } = settings;
  const isTransparent = preset.background.kind === 'transparent';
  const solidColor = preset.background.kind === 'solid' ? preset.background.color : '#ffffff';

  const setMargin = (side: keyof Preset['fit']['margin'], percent: number) => {
    const value = percent / 100;
    patchPreset((p) => ({
      ...p,
      fit: {
        ...p.fit,
        margin: linkedMargins
          ? { top: value, right: value, bottom: value, left: value }
          : { ...p.fit.margin, [side]: value },
      },
    }));
  };

  const marginPercent = (side: keyof Preset['fit']['margin']) =>
    Math.round(preset.fit.margin[side] * 100);

  return (
    <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-l border-zinc-200 bg-white">
      <Section title={t('settingsBackground')}>
        <div className="flex rounded-lg bg-zinc-100 p-0.5 text-sm">
          <button
            type="button"
            onClick={() => patchPreset((p) => ({ ...p, background: { kind: 'transparent' } }))}
            className={`flex-1 rounded-md px-2 py-1 ${isTransparent ? 'bg-white shadow' : 'text-zinc-500'}`}
          >
            {t('settingsBgTransparent')}
          </button>
          <button
            type="button"
            onClick={() =>
              patchPreset((p) => ({ ...p, background: { kind: 'solid', color: solidColor } }))
            }
            className={`flex-1 rounded-md px-2 py-1 ${!isTransparent ? 'bg-white shadow' : 'text-zinc-500'}`}
          >
            {t('settingsBgSolid')}
          </button>
        </div>
        {!isTransparent && (
          <div className="flex items-center gap-2">
            {SWATCHES.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={color}
                onClick={() => patchPreset((p) => ({ ...p, background: { kind: 'solid', color } }))}
                className={`h-7 w-7 rounded-full border ${
                  solidColor === color ? 'border-blue-600 ring-2 ring-blue-200' : 'border-zinc-300'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
            <input
              type="color"
              value={solidColor}
              onChange={(e) =>
                patchPreset((p) => ({ ...p, background: { kind: 'solid', color: e.target.value } }))
              }
              aria-label={t('settingsBgSolid')}
              className="h-7 w-9 cursor-pointer rounded border border-zinc-300"
            />
          </div>
        )}
        {isTransparent && preset.output.format === 'jpeg' && (
          <p className="text-xs text-amber-600">{t('settingsBgJpegNote')}</p>
        )}
      </Section>

      <Section title={t('settingsEdge')}>
        <Slider
          label={t('settingsEdgeThreshold')}
          min={0}
          max={1}
          step={0.05}
          value={edge.threshold}
          onChange={(threshold) =>
            void updateSettings((s) => ({ ...s, edge: { ...s.edge, threshold } }))
          }
        />
        <Slider
          label={t('settingsEdgeErode')}
          min={0}
          max={5}
          step={1}
          value={edge.erode}
          onChange={(erode) => void updateSettings((s) => ({ ...s, edge: { ...s.edge, erode } }))}
        />
        <Slider
          label={t('settingsEdgeFeather')}
          min={0}
          max={10}
          step={1}
          value={edge.feather}
          onChange={(feather) =>
            void updateSettings((s) => ({ ...s, edge: { ...s.edge, feather } }))
          }
        />
        <button
          type="button"
          onClick={resetEdgeSettings}
          className="self-start text-xs text-blue-600 hover:underline"
        >
          {t('settingsEdgeReset')}
        </button>
      </Section>

      <Section title={t('settingsPreset')}>
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label={t('settingsCanvasWidth')}
            value={preset.canvas.width}
            onChange={(width) =>
              patchPreset((p) => ({ ...p, canvas: { ...p.canvas, width } }))
            }
          />
          <NumberField
            label={t('settingsCanvasHeight')}
            value={preset.canvas.height}
            onChange={(height) =>
              patchPreset((p) => ({ ...p, canvas: { ...p.canvas, height } }))
            }
          />
        </div>

        <span className="mt-1 text-sm text-zinc-700">{t('settingsMargins')}</span>
        <label className="flex items-center gap-2 text-xs text-zinc-500">
          <input
            type="checkbox"
            checked={linkedMargins}
            onChange={(e) => setLinkedMargins(e.target.checked)}
            className="accent-blue-600"
          />
          {t('settingsMarginsLinked')}
        </label>
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label={t('settingsMarginTop')}
            value={marginPercent('top')}
            min={0}
            max={45}
            onChange={(v) => setMargin('top', v)}
          />
          <NumberField
            label={t('settingsMarginRight')}
            value={marginPercent('right')}
            min={0}
            max={45}
            onChange={(v) => setMargin('right', v)}
          />
          <NumberField
            label={t('settingsMarginBottom')}
            value={marginPercent('bottom')}
            min={0}
            max={45}
            onChange={(v) => setMargin('bottom', v)}
          />
          <NumberField
            label={t('settingsMarginLeft')}
            value={marginPercent('left')}
            min={0}
            max={45}
            onChange={(v) => setMargin('left', v)}
          />
        </div>

        <label className="flex flex-col gap-1 text-sm text-zinc-700">
          {t('settingsAnchor')}
          <select
            value={preset.anchor}
            onChange={(e) =>
              patchPreset((p) => ({ ...p, anchor: e.target.value as Preset['anchor'] }))
            }
            className="rounded-md border border-zinc-300 px-2 py-1 text-sm"
          >
            <option value="center">{t('settingsAnchorCenter')}</option>
            <option value="top">{t('settingsAnchorTop')}</option>
            <option value="bottom">{t('settingsAnchorBottom')}</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={!preset.fit.allowUpscale}
            onChange={(e) =>
              patchPreset((p) => ({
                ...p,
                fit: { ...p.fit, allowUpscale: !e.target.checked },
              }))
            }
            className="accent-blue-600"
          />
          {t('settingsNoUpscale')}
        </label>
      </Section>

      <Section title={t('settingsFormat')}>
        <select
          value={preset.output.format}
          onChange={(e) =>
            patchPreset((p) => ({
              ...p,
              output: { ...p.output, format: e.target.value as Preset['output']['format'] },
            }))
          }
          className="rounded-md border border-zinc-300 px-2 py-1 text-sm"
        >
          <option value="png">PNG</option>
          <option value="jpeg">JPEG</option>
          <option value="webp">WebP</option>
        </select>
        {preset.output.format !== 'png' && (
          <Slider
            label={t('settingsQuality')}
            min={0.5}
            max={1}
            step={0.01}
            value={preset.output.quality}
            onChange={(quality) =>
              patchPreset((p) => ({ ...p, output: { ...p.output, quality } }))
            }
          />
        )}
      </Section>
    </aside>
  );
}
