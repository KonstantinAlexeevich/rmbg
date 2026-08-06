import { defineConfig, devices } from '@playwright/test';

const STUDIO_URL = process.env.STUDIO_URL ?? 'http://localhost:5173/studio';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 360_000,
  expect: { timeout: 60_000 },
  reporter: [['list']],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: STUDIO_URL,
    locale: 'en-US',
    acceptDownloads: true,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev:web',
    url: STUDIO_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
