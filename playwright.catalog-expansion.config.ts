import { defineConfig } from '@playwright/test'

// This gate needs the generated edition preview pages only, not consumers.
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: ['catalog-expansion.spec.ts', 'catalog-recipe-appearances.spec.ts'],
  timeout: 90000,
  expect: { timeout: 10000 },
  workers: 2,
  retries: 0,
  use: {
    browserName: 'chromium',
    channel: process.env.OMBELLE_BROWSER_CHANNEL || 'msedge',
    baseURL: 'http://127.0.0.1:4184',
    headless: true,
    viewport: { width: 1100, height: 800 },
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  reporter: [['list']],
  webServer: {
    command: 'node node_modules/vite/bin/vite.js apps/preview --config apps/preview/vite.config.ts --port 4184',
    url: 'http://127.0.0.1:4184',
    reuseExistingServer: true,
  },
})
