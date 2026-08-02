import { useState } from 'react';
import { renamePreset } from '../../../core/storage/settings';
import type { Preset } from '../../../core/preset/types';
import type { ItemOverride } from '../../../core/types';
import { t } from '../../state/i18n';
import { updateSettings } from '../../state/orchestrator';
import { NumberField, Slider } from '../controls';

const SWATCHES = ['#ffffff', '#f4f4f5', '#000000'];

export function LayoutSection({
  preset,
  sizeMode,
  canvas,
  fit,
  anchor,
  background,
  editingOverride,
  patchLayout,
}: {
  preset: Preset;
  sizeMode: Preset['sizeMode'];
  canvas: Preset['canvas'];
  fit: Preset['fit'];
  anchor: Preset['anchor'];
  background: Preset['background'];
  editingOverride: boolean;
  patchLayout: (mutate: (fields: ItemOverride) => Partial<ItemOverride>) => void;
}) {
  const [linkedMargins, setLinkedMargins] = useState(true);

  const isTransparent = background.kind === 'transparent';
  const solidColor = background.kind === 'solid' ? background.color : '#ffffff';
  const isFixed = sizeMode === 'fixed';

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
    <div className="flex flex-col gap-2.5">
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
              onClick={() => patchLayout(() => ({ background: { kind: 'solid', color } }))}
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
    </div>
  );
}
