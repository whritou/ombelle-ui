import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: 'usage-example-layout.spec.ts',
  timeout: 90000,
  workers: 2,
  retries: 0,
  use: {
    browserName: 'chromium',
    channel: process.env.OMBELLE_BROWSER_CHANNEL || undefined,
    baseURL: 'http://127.0.0.1:4186',
    headless: true,
    viewport: { width: 1100, height: 900 },
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  reporter: [
    ['list'],
    ['json', { outputFile: '.artifacts/usage-examples/results.json' }],
  ],
  webServer: {
    command:
      'node node_modules/vite/bin/vite.js apps/preview/src/generated/usage-audit --config scripts/usage-audit-vite.config.ts --port 4186 --host 127.0.0.1',
    url: 'http://127.0.0.1:4186',
    reuseExistingServer: true,
  },
})
