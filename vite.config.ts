import { rename, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Vite кладёт HTML по пути исходника (dist/src/studio/index.html).
// Расширению удобнее плоский dist: переносим в dist/studio.html.
// Ссылки на ассеты в HTML абсолютные (base '/'), перенос их не ломает.
function flattenStudioHtml(): Plugin {
  return {
    name: 'rmbg:flatten-studio-html',
    apply: 'build',
    async closeBundle() {
      const dist = resolve(import.meta.dirname, 'dist');
      await rename(
        resolve(dist, 'src/studio/index.html'),
        resolve(dist, 'studio.html'),
      );
      await rm(resolve(dist, 'src'), { recursive: true, force: true });
    },
  };
}

export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss(), flattenStudioHtml()],
  build: {
    target: 'es2022',
    // Blob-URL-воркер не пройдёт CSP расширения — только отдельные файлы.
    rollupOptions: {
      input: {
        studio: resolve(import.meta.dirname, 'src/studio/index.html'),
        'service-worker': resolve(
          import.meta.dirname,
          'src/background/service-worker.ts',
        ),
      },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === 'service-worker' ? '[name].js' : 'assets/[name]-[hash].js',
      },
    },
  },
  worker: {
    format: 'es',
  },
});
