import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { rename, rm } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, type Connect, type Plugin, type PreviewServer, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

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

/** Удобные URL: / → студия, /about.html → about. */
function prettyDevRoutes(): Plugin {
  return {
    name: 'rmbg:pretty-dev-routes',
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, _res, next) => {
        const url = req.url ?? '';
        if (url === '/' || url.startsWith('/?') || url === '/index.html') {
          req.url = '/src/studio/index.html' + (url.includes('?') ? url.slice(url.indexOf('?')) : '');
        } else if (url === '/about.html' || url.startsWith('/about.html?')) {
          req.url =
            '/src/legal/about.html' + (url.includes('?') ? url.slice(url.indexOf('?')) : '');
        }
        next();
      });
    },
  };
}

// После build: dist-web/src/studio/index.html → index.html, about → about.html;
// убираем manifest.json из public (он нужен только расширению).
function flattenWebPages(): Plugin {
  return {
    name: 'rmbg:flatten-web-pages',
    apply: 'build',
    async closeBundle() {
      const dist = resolve(import.meta.dirname, 'dist-web');
      await rename(
        resolve(dist, 'src/studio/index.html'),
        resolve(dist, 'index.html'),
      );
      await rename(
        resolve(dist, 'src/legal/about.html'),
        resolve(dist, 'about.html'),
      );
      await rm(resolve(dist, 'src'), { recursive: true, force: true });
      await rm(resolve(dist, 'manifest.json'), { force: true });
    },
  };
}

export default defineConfig({
  base: '/',
  define: appDefines,
  plugins: [react(), tailwindcss(), prettyDevRoutes(), serveOrtAssets(), flattenWebPages()],
  build: {
    outDir: 'dist-web',
    emptyOutDir: true,
    target: 'es2022',
    rollupOptions: {
      input: {
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
});
