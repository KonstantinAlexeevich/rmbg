import { readFileSync } from 'node:fs';
import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build as esbuild } from 'esbuild';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import {
  DEFAULT_STUDIO_WEB_URL,
  normalizeStudioWebUrl,
  studioOriginPattern,
} from './scripts/studio-url';

const pkg = JSON.parse(
  readFileSync(resolve(import.meta.dirname, 'package.json'), 'utf8'),
) as { version: string };

function resolveStudioWebUrl(mode: string): string {
  const env = loadEnv(mode, import.meta.dirname, '');
  const raw =
    process.env.VITE_STUDIO_WEB_URL ||
    env.VITE_STUDIO_WEB_URL ||
    DEFAULT_STUDIO_WEB_URL;
  return normalizeStudioWebUrl(raw);
}

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
      // PWA assets are for dist-web only.
      await rm(resolve(dist, 'manifest.webmanifest'), { force: true });
      await rm(resolve(dist, 'sw.js'), { force: true });
    },
  };
}

/**
 * Content script в манифесте — классический скрипт (без type:module).
 * Vite иначе выносит shared в assets/*.js с import — CS падает при загрузке.
 * Пересобираем studio-bridge в один IIFE поверх vite-чанка.
 */
function bundleContentScript(defines: Record<string, string>): Plugin {
  return {
    name: 'rmbg:bundle-content-script',
    apply: 'build',
    async closeBundle() {
      await esbuild({
        entryPoints: [resolve(import.meta.dirname, 'src/content/studio-bridge.ts')],
        outfile: resolve(import.meta.dirname, 'dist/studio-bridge.js'),
        bundle: true,
        format: 'iife',
        target: 'es2022',
        platform: 'browser',
        logLevel: 'silent',
        define: defines,
      });
    },
  };
}

/** host_permissions + content_scripts.matches ← origin из VITE_STUDIO_WEB_URL. */
function injectStudioOrigin(studioWebUrl: string): Plugin {
  const pattern = studioOriginPattern(studioWebUrl);
  return {
    name: 'rmbg:inject-studio-origin',
    apply: 'build',
    async closeBundle() {
      const manifestPath = resolve(import.meta.dirname, 'dist/manifest.json');
      const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
        host_permissions?: string[];
        content_scripts?: Array<{ matches?: string[] }>;
      };
      manifest.host_permissions = [pattern];
      for (const script of manifest.content_scripts ?? []) {
        script.matches = [pattern];
      }
      await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    },
  };
}

// Студия вынесена в web-сборку; в пакет расширения входят SW и about.
export default defineConfig(({ mode }) => {
  const studioWebUrl = resolveStudioWebUrl(mode);
  console.info(`[rmbg] extension build: studio → ${studioWebUrl}`);

  const appDefines = {
    'import.meta.env.VITE_APP_TARGET': JSON.stringify('extension'),
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
    'import.meta.env.VITE_STUDIO_WEB_URL': JSON.stringify(studioWebUrl),
  };

  return {
    base: '/',
    define: appDefines,
    plugins: [
      react(),
      tailwindcss(),
      flattenPages(),
      injectStudioOrigin(studioWebUrl),
      bundleContentScript(appDefines),
    ],
    build: {
      target: 'es2022',
      rollupOptions: {
        input: {
          about: resolve(import.meta.dirname, 'src/legal/about.html'),
          'service-worker': resolve(
            import.meta.dirname,
            'src/background/service-worker.ts',
          ),
          // Entry нужен, чтобы Vite знал о файле; closeBundle перезапишет IIFE.
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
  };
});
