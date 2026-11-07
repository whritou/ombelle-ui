import { defineConfig } from '@playwright/test'
// Edition parity needs only the preview server; playwright.config.ts also
// starts every consumer listed in .artifacts/consumers.json.
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: 'edition-parity.spec.ts',
  timeout: 60000,
  expect: { timeout: 10000 },
  workers: 2,
  retries: 0,
  use: {
    browserName: 'chromium',
    channel: process.env.OMBELLE_BROWSER_CHANNEL || undefined,
    headless: true,
    viewport: { width: 1100, height: 800 },
    reducedMotion: 'reduce',
  },
  reporter: [['list']],
  webServer: [
    {
      command: 'pnpm dev:preview',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: true,
    },
  ],
})
