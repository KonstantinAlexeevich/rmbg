import { describe, expect, it } from 'vitest';
import { effectiveBackground, type Preset } from './types';

function preset(partial: Partial<Preset>): Preset {
  return {
    id: 'p',
    name: 'n',
    sizeMode: 'original',
    canvas: { width: 100, height: 100 },
    fit: {
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      mode: 'contain',
      allowZoom: false,
    },
    anchor: 'center',
    background: { kind: 'transparent' },
    output: { format: 'png', quality: 0.9 },
    ...partial,
  };
}

describe('effectiveBackground', () => {
  it('forces white solid for jpeg + transparent', () => {
    expect(
      effectiveBackground(
        preset({
          background: { kind: 'transparent' },
          output: { format: 'jpeg', quality: 0.9 },
        }),
      ),
    ).toEqual({ kind: 'solid', color: '#ffffff' });
  });

  it('keeps transparent for png/webp and solid for jpeg', () => {
    expect(
      effectiveBackground(
        preset({
          background: { kind: 'transparent' },
          output: { format: 'png', quality: 0.9 },
        }),
      ),
    ).toEqual({ kind: 'transparent' });

    expect(
      effectiveBackground(
        preset({
          background: { kind: 'solid', color: '#abc' },
          output: { format: 'jpeg', quality: 0.9 },
        }),
      ),
    ).toEqual({ kind: 'solid', color: '#abc' });
  });
});
