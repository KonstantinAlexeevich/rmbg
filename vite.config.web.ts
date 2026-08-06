import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  defineConfig,
  loadEnv,
  type Connect,
  type Plugin,
  type PreviewServer,
  type ViteDevServer,
} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import {
  DEFAULT_STUDIO_WEB_URL,
  normalizeStudioWebUrl,
} from './scripts/studio-url';

const pkg = JSON.parse(
  readFileSync(resolve(import.meta.dirname, 'package.json'), 'utf8'),
) as { version: string };

const isolationHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

const appDefines = {
  'import.meta.env.VITE_APP_TARGET': JSON.stringify('web'),
  'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
};

/** Origin публичного сайта: из VITE_STUDIO_WEB_URL (или VITE_SITE_ORIGIN). Пусто → относительные URL. */
function resolveSiteOrigin(mode: string): string {
  const env = loadEnv(mode, import.meta.dirname, '');
  const raw =
    process.env.VITE_SITE_ORIGIN ||
    process.env.VITE_STUDIO_WEB_URL ||
    env.VITE_SITE_ORIGIN ||
    env.VITE_STUDIO_WEB_URL ||
    DEFAULT_STUDIO_WEB_URL;
  try {
    return new URL(normalizeStudioWebUrl(raw)).origin;
  } catch {
    return '';
  }
}

/** Подставляет %SITE_ORIGIN% в HTML (canonical / Open Graph / JSON-LD). */
function stampSiteOrigin(mode: string): Plugin {
  const origin = resolveSiteOrigin(mode);
  return {
    name: 'rmbg:stamp-site-origin',
    transformIndexHtml(html) {
      return html.replaceAll('%SITE_ORIGIN%', origin);
    },
  };
}

const mimeByExt: Record<string, string> = {
  '.wasm': 'application/wasm',
  '.mjs': 'text/javascript',
  '.js': 'text/javascript',
  '.json': 'application/json',
};

function sendOrtFile(filePath: string, res: ServerResponse): void {
  const type = mimeByExt[extname(filePath)] ?? 'application/octet-stream';
  res.setHeader('Content-Type', type);
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Cache-Control', 'no-cache');
  createReadStream(filePath).pipe(res);
}

function ortMiddleware(ortDir: string): Connect.NextHandleFunction {
  return (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
    const url = req.url ?? '';
    if (!url.startsWith('/ort/')) {
      next();
      return;
    }
    const name = decodeURIComponent(url.slice('/ort/'.length).split('?')[0] ?? '');
    if (name === '' || name.includes('..') || name.includes('/')) {
      next();
      return;
    }
    const filePath = join(ortDir, name);
    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
      next();
      return;
    }
    sendOrtFile(filePath, res);
  };
}

/** В dev отдаём ORT из node_modules; после build — из dist-web/ort (copy-ort-assets). */
function serveOrtAssets(): Plugin {
  const ortPkg = resolve(import.meta.dirname, 'node_modules/onnxruntime-web/dist');
  return {
    name: 'rmbg:serve-ort',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(ortMiddleware(ortPkg));
    },
    configurePreviewServer(server: PreviewServer) {
      // preview уже отдаёт dist-web/ort после copy-ort-assets
      server.middlewares.use((_req, res, next) => {
        res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
        next();
      });
    },
  };
}

function qs(url: string): string {
  return url.includes('?') ? url.slice(url.indexOf('?')) : '';
}

function pathOnly(url: string): string {
  return url.split('?')[0] ?? '';
}

/** Удобные URL: / → лендинг, /studio → студия, /about → about.
 *  /studio/ и /about/ редиректим на канон без trailing slash. */
function prettyDevRoutes(): Plugin {
  const redirectNoTrailingSlash = (path: string, canon: string, query: string, res: ServerResponse) => {
    if (path === `${canon}/`) {
      res.statusCode = 302;
      res.setHeader('Location', `${canon}${query}`);
      res.end();
      return true;
    }
    return false;
  };

  const attach = (middlewares: Connect.Server) => {
    middlewares.use((req, res, next) => {
      const url = req.url ?? '';
      const path = pathOnly(url);
      const query = qs(url);

      if (
        redirectNoTrailingSlash(path, '/studio', query, res) ||
        redirectNoTrailingSlash(path, '/about', query, res)
      ) {
        return;
      }

      if (path === '/' || path === '/index.html') {
        req.url = `/src/landing/index.html${query}`;
      } else if (path === '/studio' || path === '/studio/index.html') {
        req.url = `/src/studio/index.html${query}`;
      } else if (path === '/about' || path === '/about/index.html') {
        req.url = `/src/legal/about.html${query}`;
      }
      next();
    });
  };

  return {
    name: 'rmbg:pretty-dev-routes',
    configureServer(server: ViteDevServer) {
      attach(server.middlewares);
    },
    configurePreviewServer(server: PreviewServer) {
      // preview отдаёт dist-web: /studio и /about без слэша → */index.html
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? '';
        const path = pathOnly(url);
        const query = qs(url);

        if (
          redirectNoTrailingSlash(path, '/studio', query, res) ||
          redirectNoTrailingSlash(path, '/about', query, res)
        ) {
          return;
        }
        if (path === '/studio') {
          req.url = `/studio/index.html${query}`;
        } else if (path === '/about') {
          req.url = `/about/index.html${query}`;
        }
        next();
      });
    },
  };
}

async function moveFile(from: string, to: string): Promise<void> {
  await mkdir(dirname(to), { recursive: true });
  await rename(from, to);
}

// После build:
// landing → index.html, studio → studio/index.html, about → about/index.html;
// убираем manifest.json из public (он нужен только расширению).
function flattenWebPages(): Plugin {
  return {
    name: 'rmbg:flatten-web-pages',
    apply: 'build',
    async closeBundle() {
      const dist = resolve(import.meta.dirname, 'dist-web');
      await moveFile(
        resolve(dist, 'src/landing/index.html'),
        resolve(dist, 'index.html'),
      );
      await moveFile(
        resolve(dist, 'src/studio/index.html'),
        resolve(dist, 'studio/index.html'),
      );
      await moveFile(
        resolve(dist, 'src/legal/about.html'),
        resolve(dist, 'about/index.html'),
      );
      await rm(resolve(dist, 'src'), { recursive: true, force: true });
      await rm(resolve(dist, 'manifest.json'), { force: true });
    },
  };
}

/** Подставляет id кэша shell SW (версия пакета), чтобы после деплоя сбросить shell. */
function stampServiceWorkerCache(): Plugin {
  return {
    name: 'rmbg:stamp-sw-cache',
    apply: 'build',
    async closeBundle() {
      const swPath = resolve(import.meta.dirname, 'dist-web/studio/sw.js');
      if (!existsSync(swPath)) return;
      const src = await readFile(swPath, 'utf8');
      await writeFile(swPath, src.replaceAll('__SW_CACHE_ID__', pkg.version));
    },
  };
}

export default defineConfig(({ mode }) => ({
  base: '/',
  define: appDefines,
  plugins: [
    react(),
    tailwindcss(),
    stampSiteOrigin(mode),
    prettyDevRoutes(),
    serveOrtAssets(),
    flattenWebPages(),
    stampServiceWorkerCache(),
  ],
  build: {
    outDir: 'dist-web',
    emptyOutDir: true,
    target: 'es2022',
    rollupOptions: {
      input: {
        landing: resolve(import.meta.dirname, 'src/landing/index.html'),
        studio: resolve(import.meta.dirname, 'src/studio/index.html'),
        about: resolve(import.meta.dirname, 'src/legal/about.html'),
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
  worker: {
    format: 'es',
  },
  server: {
    port: 5173,
    strictPort: true,
    headers: isolationHeaders,
  },
  preview: {
    port: 4173,
    strictPort: true,
    headers: isolationHeaders,
  },
}));
