export type OutputFormat = 'png' | 'jpeg' | 'webp';

export type Background =
  | { kind: 'transparent' }
  | { kind: 'solid'; color: string };

export type Preset = {
  id: string;
  name: string;
  // original — полный кадр исходника без кропа/масштаба;
  // fixed — холст, поля и привязка из canvas/fit/anchor
  sizeMode: 'original' | 'fixed';
  canvas: { width: number; height: number };
  fit: {
    // доля холста, оставляемая пустой по каждой стороне (0..1)
    margin: { top: number; right: number; bottom: number; left: number };
    // как вписывать: целиком по обеим осям или по ширине с возможным обрезом
    mode: 'contain' | 'cover-width';
    // разрешение увеличивать субъект выше 100% исходного масштаба
    allowZoom: boolean;
  };
  anchor: 'center' | 'top' | 'bottom';
  background: Background;
  output: { format: OutputFormat; quality: number };
};

// Default display name is English (UI source locale). Callers that know the
// active locale pass a localized name (e.g. t('outputDefaultName')).
export function defaultPreset(name = 'Original'): Preset {
  return {
    id: crypto.randomUUID(),
    name,
    sizeMode: 'original',
    canvas: { width: 1200, height: 1600 },
    fit: {
      margin: { top: 0.05, right: 0.05, bottom: 0.05, left: 0.05 },
      mode: 'contain',
      allowZoom: false,
    },
    anchor: 'center',
    background: { kind: 'transparent' },
    output: { format: 'png', quality: 0.92 },
  };
}

// transparent совместим только с png и webp; для jpeg фон принудительно однотонный
export function effectiveBackground(preset: Preset): Background {
  if (preset.output.format === 'jpeg' && preset.background.kind === 'transparent') {
    return { kind: 'solid', color: '#ffffff' };
  }
  return preset.background;
}
