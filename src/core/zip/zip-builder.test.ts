import { describe, expect, it } from 'vitest';
import { ZipBuilder } from './archive';

describe('ZipBuilder.finish', () => {
  it('builds a non-empty zip blob', async () => {
    const zip = new ZipBuilder();
    const name = zip.uniqueName('a.png', 'png');
    zip.add(name, new Uint8Array([1, 2, 3, 4]));
    const blob = await zip.finish();
    expect(blob.type).toBe('application/zip');
    expect(blob.size).toBeGreaterThan(20);
  });
});
