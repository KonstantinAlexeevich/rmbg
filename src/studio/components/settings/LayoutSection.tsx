import { Link2, Link2Off } from 'lucide-react';
import { useState } from 'react';
import { renamePreset } from '../../../core/storage/settings';
import type { Preset } from '../../../core/preset/types';
import type { ItemOverride } from '../../../core/types';
import { t } from '../../state/i18n';
import { updateSettings } from '../../state/orchestrator';
import { NumberField, Slider } from '../controls';

const SWATCHES = [
  { color: '#ffffff', labelKey: 'bgWhite' as const },
  { color: '#f4f4f5', labelKey: 'bgLightGray' as const },
  { color: '#000000', labelKey: 'bgBlack' as const },
];

function marginsEqual(margin: Preset['fit']['margin']): boolean {
  return (
    margin.top === margin.right &&
    margin.top === margin.bottom &&
    margin.top === margin.left
  );
}

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
  // По умолчанию — одно поле; если стороны уже разные — сразу разъединённый вид.
  const [linkedMargins, setLinkedMargins] = useState(() => marginsEqual(fit.margin));

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
        allowUpscale: fields.fit.allowUpscale === true,
      },
    }));
  };

  const marginPercent = (side: keyof Preset['fit']['margin']) =>
    Math.round(fit.margin[side] * 100);

  const toggleLinked = () => {
    if (!linkedMargins) {
      // Снова связываем — выравниваем все стороны по верхнему значению.
      const value = fit.margin.top;
      patchLayout((fields) => ({
        fit: {
          ...fields.fit,
          margin: { top: value, right: value, bottom: value, left: value },
          allowUpscale: fields.fit.allowUpscale === true,
        },
      }));
    }
    setLinkedMargins((v) => !v);
  };

  return (
    <div className="flex flex-col gap-2.5">
      {!editingOverride && (
        <label className="flex flex-col gap-1 text-sm text-zinc-700">
          {t('outputName')}
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
                renamePreset(
                  s,
                  s.activePresetId,
                  trimmed === '' ? t('outputDefaultName') : trimmed,
                ),
              );
            }}
            className="rounded-md border border-zinc-300 px-2 py-1 text-sm"
          />
        </label>
      )}

      <span className="mt-1 text-sm font-medium text-zinc-700">{t('canvasLabel')}</span>
      <div className="flex rounded-lg bg-zinc-100 p-0.5 text-sm">
        <button
          type="button"
          onClick={() => patchLayout(() => ({ sizeMode: 'original' }))}
          className={`flex-1 rounded-md px-2 py-1 ${!isFixed ? 'bg-white shadow' : 'text-zinc-500'}`}
        >
          {t('canvasOriginal')}
        </button>
        <button
          type="button"
          onClick={() => patchLayout(() => ({ sizeMode: 'fixed' }))}
          className={`flex-1 rounded-md px-2 py-1 ${isFixed ? 'bg-white shadow' : 'text-zinc-500'}`}
        >
          {t('canvasCustom')}
        </button>
      </div>

      <span className="mt-1 text-sm font-medium text-zinc-700">{t('backgroundLabel')}</span>
      <div className="flex rounded-lg bg-zinc-100 p-0.5 text-sm">
        <button
          type="button"
          onClick={() => patchLayout(() => ({ background: { kind: 'transparent' } }))}
          className={`flex-1 rounded-md px-2 py-1 ${isTransparent ? 'bg-white shadow' : 'text-zinc-500'}`}
        >
          {t('bgTransparent')}
        </button>
        <button
          type="button"
          onClick={() =>
            patchLayout(() => ({ background: { kind: 'solid', color: solidColor } }))
          }
          className={`flex-1 rounded-md px-2 py-1 ${!isTransparent ? 'bg-white shadow' : 'text-zinc-500'}`}
        >
          {t('bgSolid')}
        </button>
      </div>
      {!isTransparent && (
        <div className="flex items-center gap-2">
          {SWATCHES.map(({ color, labelKey }) => (
            <button
              key={color}
              type="button"
              aria-label={t(labelKey)}
              title={t(labelKey)}
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
            aria-label={t('bgCustomColor')}
            title={t('bgCustomColor')}
            className="h-7 w-9 cursor-pointer rounded border border-zinc-300"
          />
        </div>
      )}
      {isTransparent && preset.output.format === 'jpeg' && (
        <p className="text-xs text-amber-600">{t('bgJpegNote')}</p>
      )}

      {isFixed && (
        <>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <NumberField
              label={t('canvasWidth')}
              value={canvas.width}
              onChange={(width) =>
                patchLayout((f) => ({ canvas: { ...f.canvas, width } }))
              }
            />
            <NumberField
              label={t('canvasHeight')}
              value={canvas.height}
              onChange={(height) =>
                patchLayout((f) => ({ canvas: { ...f.canvas, height } }))
              }
            />
          </div>

          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="text-sm text-zinc-700">{t('paddingLabel')}</span>
            <button
              type="button"
              onClick={toggleLinked}
              aria-pressed={linkedMargins}
              aria-label={linkedMargins ? t('paddingUnlink') : t('paddingLink')}
              title={linkedMargins ? t('paddingUnlink') : t('paddingLink')}
              className={`rounded-md border p-1.5 ${
                linkedMargins
                  ? 'border-blue-300 bg-blue-50 text-blue-700'
                  : 'border-zinc-300 text-zinc-500 hover:bg-zinc-50'
              }`}
            >
              {linkedMargins ? (
                <Link2 className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <Link2Off className="h-3.5 w-3.5" aria-hidden />
              )}
            </button>
          </div>
          {linkedMargins ? (
            <NumberField
              ariaLabel={t('paddingLabel')}
              value={marginPercent('top')}
              min={0}
              max={45}
              onChange={(v) => setMargin('top', v)}
            />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label={t('marginTop')}
                value={marginPercent('top')}
                min={0}
                max={45}
                onChange={(v) => setMargin('top', v)}
              />
              <NumberField
                label={t('marginRight')}
                value={marginPercent('right')}
                min={0}
                max={45}
                onChange={(v) => setMargin('right', v)}
              />
              <NumberField
                label={t('marginBottom')}
                value={marginPercent('bottom')}
                min={0}
                max={45}
                onChange={(v) => setMargin('bottom', v)}
              />
              <NumberField
                label={t('marginLeft')}
                value={marginPercent('left')}
                min={0}
                max={45}
                onChange={(v) => setMargin('left', v)}
              />
            </div>
          )}

          <label className="flex flex-col gap-1 text-sm text-zinc-700">
            {t('alignmentLabel')}
            <select
              value={anchor}
              onChange={(e) =>
                patchLayout(() => ({
                  anchor: e.target.value as Preset['anchor'],
                }))
              }
              className="rounded-md border border-zinc-300 px-2 py-1 text-sm"
            >
              <option value="center">{t('alignmentMiddle')}</option>
              <option value="top">{t('alignmentTop')}</option>
              <option value="bottom">{t('alignmentBottom')}</option>
            </select>
          </label>

          <label
            className="flex items-center gap-2 text-sm text-zinc-700"
            title={t('noUpscaleHint')}
          >
            <input
              type="checkbox"
              checked={fit.allowUpscale !== true}
              onChange={() =>
                patchLayout((f) => ({
                  fit: {
                    ...f.fit,
                    margin: { ...f.fit.margin },
                    // Инверсия от текущего значения в слепке/пресете — не от DOM,
                    // чтобы асинхронный patch не терял клик.
                    allowUpscale: f.fit.allowUpscale === true ? false : true,
                  },
                }))
              }
              className="accent-blue-600"
            />
            {t('noUpscale')}
          </label>
        </>
      )}

      {!editingOverride && (
        <>
          <label className="flex flex-col gap-1 text-sm text-zinc-700">
            {t('formatLabel')}
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
              label={t('qualityLabel')}
              min={0.5}
              max={1}
              step={0.01}
              value={preset.output.quality}
              displayValue={String(Math.round(preset.output.quality * 100))}
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
