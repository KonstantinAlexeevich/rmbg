import { readFileSync } from 'node:fs';
import { rename, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const pkg = JSON.parse(
  readFileSync(resolve(import.meta.dirname, 'package.json'), 'utf8'),
) as { version: string };

const appDefines = {
  'import.meta.env.VITE_APP_TARGET': JSON.stringify('extension'),
  'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
};

// Vite кладёт HTML по пути исходника (dist/src/legal/about.html).
// Расширению удобнее плоский dist: переносим в dist/about.html.
function flattenPages(): Plugin {
  return {
    name: 'rmbg:flatten-pages',
    apply: 'build',
    async closeBundle() {
      const dist = resolve(import.meta.dirname, 'dist');
      await rename(
        resolve(dist, 'src/legal/about.html'),
        resolve(dist, 'about.html'),
      );
      await rm(resolve(dist, 'src'), { recursive: true, force: true });
    },
  };
}

// Студия вынесена в web-сборку; в пакет расширения входят SW и about.
export default defineConfig({
  base: '/',
  define: appDefines,
  plugins: [react(), tailwindcss(), flattenPages()],
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        about: resolve(import.meta.dirname, 'src/legal/about.html'),
        'service-worker': resolve(
          import.meta.dirname,
          'src/background/service-worker.ts',
        ),
        'studio-bridge': resolve(
          import.meta.dirname,
          'src/content/studio-bridge.ts',
        ),
      },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === 'service-worker' || chunk.name === 'studio-bridge'
            ? '[name].js'
            : 'assets/[name]-[hash].js',
      },
    },
  },
});
