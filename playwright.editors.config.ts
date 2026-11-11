import { defineConfig } from '@playwright/test'

// The glass editor checks (tests/e2e/editors-glass.spec.ts) need the website and the
// preview only, not the consumer apps. Run pnpm build:packages and pnpm generate:preview first.
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: ['editors-glass.spec.ts', 'editors-matrix.spec.ts'],
  timeout: 120000,
  expect: { timeout: 15000 },
  workers: 1,
  retries: 0,
  use: {
    browserName: 'chromium',
    channel: process.env.OMBELLE_BROWSER_CHANNEL || undefined,
    headless: true,
    viewport: { width: 1100, height: 800 },
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  reporter: [['list']],
  webServer: [
    {
      command: 'pnpm exec tsx scripts/serve-snapshot-www.ts',
      url: 'http://127.0.0.1:3000/editor/component/button',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: 'pnpm dev:preview',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: !process.env.CI,
    },
  ],
})
