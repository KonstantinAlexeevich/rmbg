/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TARGET: 'extension' | 'web';
  readonly VITE_APP_VERSION: string;
  /** URL web-студии; задаётся на билде расширения (см. vite.config.ts). */
  readonly VITE_STUDIO_WEB_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
