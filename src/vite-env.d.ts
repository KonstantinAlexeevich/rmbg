/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TARGET: 'extension' | 'web';
  readonly VITE_APP_VERSION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
