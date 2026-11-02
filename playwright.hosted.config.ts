import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: 'tests/hosted-browser',
  timeout: 120_000,
  expect: { timeout: 30_000 },
  workers: 1,
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:3400', browserName: 'chromium',
    channel: process.env.OMBELLE_BROWSER_CHANNEL || undefined,
    headless: true, viewport: { width: 1100, height: 800 },
    reducedMotion: 'reduce', trace: 'retain-on-failure',
  },
  reporter: [['list'], ['json', { outputFile: '.artifacts/hosted-browser-results.json' }]],
  webServer: {
    command: 'node apps/www/node_modules/next/dist/bin/next start apps/www --hostname 127.0.0.1 --port 3400',
    url: 'http://127.0.0.1:3400/editor/component/button',
    reuseExistingServer: false,
    timeout: 60_000,
    env: { NEXT_TELEMETRY_DISABLED: '1', NEXT_PUBLIC_OMBELLE_PREVIEW_ORIGIN: '' },
  },
})
