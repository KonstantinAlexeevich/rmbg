import { Zip, ZipPassThrough } from 'fflate';

// Потоковая сборка ZIP без сжатия (store): PNG, JPEG и WebP уже сжаты,
// дефлейт дал бы доли процента при заметных затратах времени.
export class ZipBuilder {
  private readonly chunks: Uint8Array[] = [];
  private readonly usedNames = new Set<string>();
  private readonly done: Promise<void>;
  private readonly zip: Zip;

  constructor() {
    let resolve: () => void;
    let reject: (e: Error) => void;
    this.done = new Promise<void>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    this.zip = new Zip((err, chunk, final) => {
      if (err !== null) {
        reject(err);
        return;
      }
      this.chunks.push(chunk);
      if (final) resolve();
    });
  }

  // имя в архиве: <исходное имя без расширения>.<новое расширение>;
  // при коллизии добавляется суффикс -2, -3
  uniqueName(originalName: string, extension: string): string {
    const base = originalName.replace(/\.[^.]+$/, '');
    let candidate = `${base}.${extension}`;
    for (let n = 2; this.usedNames.has(candidate); n++) {
      candidate = `${base}-${n}.${extension}`;
    }
    this.usedNames.add(candidate);
    return candidate;
  }

  add(name: string, bytes: Uint8Array): void {
    const entry = new ZipPassThrough(name);
    this.zip.add(entry);
    entry.push(bytes, true);
  }

  async finish(): Promise<Blob> {
    this.zip.end();
    await this.done;
    return new Blob(this.chunks as BlobPart[], { type: 'application/zip' });
  }
}

export function archiveFileName(date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `rmbg-${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}-${p(date.getHours())}${p(date.getMinutes())}.zip`;
}
