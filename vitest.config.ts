import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_TARGET': JSON.stringify('web'),
    'import.meta.env.VITE_APP_VERSION': JSON.stringify('0.1.0'),
    'import.meta.env.VITE_STUDIO_WEB_URL': JSON.stringify('http://localhost:5173/studio'),
    'import.meta.env.PROD': JSON.stringify(false),
  },
  test: {
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary'],
      include: ['src/**/*.{ts,tsx}', 'scripts/studio-url.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.tsx',
        'src/**/main.tsx',
        'src/workers/**',
        'src/landing/**',
        'src/legal/**',
        'src/studio/components/**',
        'src/studio/App.tsx',
        'src/background/service-worker.ts',
        'src/background/context-menu.ts',
        'src/content/studio-bridge.ts',
        'src/vite-env.d.ts',
      ],
    },
  },
});
