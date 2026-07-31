import { useState } from 'react';
import {
  activePreset,
  addPreset,
  removePreset,
  renamePreset,
  setActivePresetId,
} from '../../core/storage/settings';
import type { Preset } from '../../core/preset/types';
import type { EdgeSettings, ItemOverride } from '../../core/types';
import { useStudioStore } from '../state/store';
import { t } from '../state/i18n';
import {
  exportZip,
  newSession,
  overrideCurrentItem,
  patchItemOverride,
  purgeOverridesForPreset,
  resetEdgeSettings,
  resetItemOverride,
  updateSettings,
} from '../state/orchestrator';

const SWATCHES = ['#ffffff', '#f4f4f5', '#000000'];

function Section({
  title,
  children,
  highlighted,
}: {
  title: string;
  children: React.ReactNode;
  highlighted?: boolean;
}) {
  return (
    <section
      className={`flex flex-col gap-2.5 border-b border-zinc-200 px-4 py-4 ${
        highlighted ? 'bg-amber-50/60' : ''
      }`}
    >
      <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

function CollapsibleSection({
  title,
  children,
  highlighted,
}: {
  title: string;
  children: React.ReactNode;
  highlighted?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className={`border-b border-zinc-200 ${highlighted ? 'bg-amber-50/60' : ''}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-4 text-left"
      >
        <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
          {title}
        </h3>
        <svg
          viewBox="0 0 20 20"
          className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        >
          <path
            fill="currentColor"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.25a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08z"
          />
        </svg>
      </button>
      {open && <div className="flex flex-col gap-2.5 px-4 pb-4">{children}</div>}
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
  const items = useStudioStore((s) => s.items);
  const compareItemId = useStudioStore((s) => s.compareItemId);
  const exporting = useStudioStore((s) => s.exporting);
  const setExportPickerOpen = useStudioStore((s) => s.setExportPickerOpen);
  const [linkedMargins, setLinkedMargins] = useState(true);

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

  const isTransparent = background.kind === 'transparent';
  const solidColor = background.kind === 'solid' ? background.color : '#ffffff';
  const isFixed = sizeMode === 'fixed';

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

  const setMargin = (side: keyof Preset['fit']['margin'], percent: number) => {
    const value = percent / 100;
    patchLayout((fields) => ({
      fit: {
        ...fields.fit,
        margin: linkedMargins
          ? { top: value, right: value, bottom: value, left: value }
          : { ...fields.fit.margin, [side]: value },
      },
    }));
  };

  const marginPercent = (side: keyof Preset['fit']['margin']) =>
    Math.round(fit.margin[side] * 100);

  return (
    <aside className="flex w-72 shrink-0 flex-col border-l border-zinc-200 bg-white">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {viewing && (
          <div className="flex flex-col gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-3">
            <span className="truncate text-xs text-zinc-500" title={compareItem.name}>
              {compareItem.name}
            </span>
            {editingOverride ? (
              <div className="flex flex-col gap-1.5">
                <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                  {t('overrideActive')}
                </span>
                <button
                  type="button"
                  onClick={() => void resetItemOverride(compareItemId)}
                  className="self-start text-xs text-blue-600 hover:underline"
                >
                  {t('overrideReset')}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void overrideCurrentItem(compareItemId)}
                className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50"
              >
                {t('overrideCreate')}
              </button>
            )}
          </div>
        )}

        <Section title={t('settingsEdge')} highlighted={editingOverride}>
          <Slider
            label={t('settingsEdgeThreshold')}
            min={0}
            max={1}
            step={0.05}
            value={edge.threshold}
            onChange={(threshold) => patchEdge({ threshold })}
          />
          <Slider
            label={t('settingsEdgeErode')}
            min={0}
            max={5}
            step={1}
            value={edge.erode}
            onChange={(erode) => patchEdge({ erode })}
          />
          <Slider
            label={t('settingsEdgeFeather')}
            min={0}
            max={10}
            step={1}
            value={edge.feather}
            onChange={(feather) => patchEdge({ feather })}
          />
          <button
            type="button"
            onClick={resetEdgeSettings}
            className="self-start text-xs text-blue-600 hover:underline"
          >
            {t('settingsEdgeReset')}
          </button>
        </Section>

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

        <CollapsibleSection title={t('settingsPresetEdit')} highlighted={editingOverride}>
          {!editingOverride && (
            <label className="flex flex-col gap-1 text-sm text-zinc-700">
              {t('settingsPresetName')}
              <input
                type="text"
                value={preset.name}
                onChange={(e) =>
                  void updateSettings((s) => renamePreset(s, s.activePresetId, e.target.value))
                }
                onBlur={() => {
                  const trimmed = preset.name.trim();
                  if (trimmed === preset.name) return;
                  void updateSettings((s) =>
                    renamePreset(s, s.activePresetId, trimmed === '' ? 'Оригинал' : trimmed),
                  );
                }}
                className="rounded-md border border-zinc-300 px-2 py-1 text-sm"
              />
            </label>
          )}

          <span className="mt-1 text-sm font-medium text-zinc-700">{t('settingsSizeMode')}</span>
          <div className="flex rounded-lg bg-zinc-100 p-0.5 text-sm">
            <button
              type="button"
              onClick={() => patchLayout(() => ({ sizeMode: 'original' }))}
              className={`flex-1 rounded-md px-2 py-1 ${!isFixed ? 'bg-white shadow' : 'text-zinc-500'}`}
            >
              {t('settingsSizeOriginal')}
            </button>
            <button
              type="button"
              onClick={() => patchLayout(() => ({ sizeMode: 'fixed' }))}
              className={`flex-1 rounded-md px-2 py-1 ${isFixed ? 'bg-white shadow' : 'text-zinc-500'}`}
            >
              {t('settingsSizeFixed')}
            </button>
          </div>

          <span className="mt-1 text-sm font-medium text-zinc-700">{t('settingsBackground')}</span>
          <div className="flex rounded-lg bg-zinc-100 p-0.5 text-sm">
            <button
              type="button"
              onClick={() => patchLayout(() => ({ background: { kind: 'transparent' } }))}
              className={`flex-1 rounded-md px-2 py-1 ${isTransparent ? 'bg-white shadow' : 'text-zinc-500'}`}
            >
              {t('settingsBgTransparent')}
            </button>
            <button
              type="button"
              onClick={() =>
                patchLayout(() => ({ background: { kind: 'solid', color: solidColor } }))
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
                  onClick={() =>
                    patchLayout(() => ({ background: { kind: 'solid', color } }))
                  }
                  className={`h-7 w-7 rounded-full border ${
                    solidColor === color
                      ? 'border-blue-600 ring-2 ring-blue-200'
                      : 'border-zinc-300'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
              <input
                type="color"
                value={solidColor}
                onChange={(e) =>
                  patchLayout(() => ({
                    background: { kind: 'solid', color: e.target.value },
                  }))
                }
                aria-label={t('settingsBgSolid')}
                className="h-7 w-9 cursor-pointer rounded border border-zinc-300"
              />
            </div>
          )}
          {isTransparent && preset.output.format === 'jpeg' && (
            <p className="text-xs text-amber-600">{t('settingsBgJpegNote')}</p>
          )}

          {isFixed && (
            <>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <NumberField
                  label={t('settingsCanvasWidth')}
                  value={canvas.width}
                  onChange={(width) =>
                    patchLayout((f) => ({ canvas: { ...f.canvas, width } }))
                  }
                />
                <NumberField
                  label={t('settingsCanvasHeight')}
                  value={canvas.height}
                  onChange={(height) =>
                    patchLayout((f) => ({ canvas: { ...f.canvas, height } }))
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
                  value={anchor}
                  onChange={(e) =>
                    patchLayout(() => ({
                      anchor: e.target.value as Preset['anchor'],
                    }))
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
                  checked={!fit.allowUpscale}
                  onChange={(e) =>
                    patchLayout((f) => ({
                      fit: { ...f.fit, allowUpscale: !e.target.checked },
                    }))
                  }
                  className="accent-blue-600"
                />
                {t('settingsNoUpscale')}
              </label>
            </>
          )}

          {!editingOverride && (
            <>
              <label className="flex flex-col gap-1 text-sm text-zinc-700">
                {t('settingsFormat')}
                <select
                  value={preset.output.format}
                  onChange={(e) =>
                    void updateSettings((s) => ({
                      ...s,
                      presets: s.presets.map((p) =>
                        p.id === s.activePresetId
                          ? {
                              ...p,
                              output: {
                                ...p.output,
                                format: e.target.value as Preset['output']['format'],
                              },
                            }
                          : p,
                      ),
                    }))
                  }
                  className="rounded-md border border-zinc-300 px-2 py-1 text-sm"
                >
                  <option value="png">PNG</option>
                  <option value="jpeg">JPEG</option>
                  <option value="webp">WebP</option>
                </select>
              </label>
              {preset.output.format !== 'png' && (
                <Slider
                  label={t('settingsQuality')}
                  min={0.5}
                  max={1}
                  step={0.01}
                  value={preset.output.quality}
                  onChange={(quality) =>
                    void updateSettings((s) => ({
                      ...s,
                      presets: s.presets.map((p) =>
                        p.id === s.activePresetId
                          ? { ...p, output: { ...p.output, quality } }
                          : p,
                      ),
                    }))
                  }
                />
              )}
            </>
          )}
        </CollapsibleSection>
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
