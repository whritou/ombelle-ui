import { defineConfig } from '@playwright/test'

// The specimen audit needs the generated preview audit pages only, not consumers.
// Run pnpm build:packages and pnpm generate:preview first.
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: ['specimen-audit-checks.spec.ts', 'specimen-audit.spec.ts', 'display-components.spec.ts', 'form-controls.spec.ts', 'primitives-075.spec.ts', 'editor-inputs-075.spec.ts', 'code-block-075.spec.ts', 'overlays-search.spec.ts', 'calendar.spec.ts', 'variants-basics.spec.ts', 'variants-more.spec.ts', 'variants-075.spec.ts', 'glass-scenes.spec.ts'],
  timeout: 300000,
  expect: { timeout: 10000 },
  workers: 4,
  retries: 0,
  use: {
    browserName: 'chromium',
    channel: process.env.OMBELLE_BROWSER_CHANNEL || undefined,
    baseURL: 'http://127.0.0.1:4185',
    headless: true,
    viewport: { width: 1100, height: 800 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  reporter: [['list']],
  webServer: {
    command: 'node node_modules/vite/bin/vite.js apps/preview --config apps/preview/vite.config.ts --port 4185 --host 127.0.0.1',
    url: 'http://127.0.0.1:4185',
    reuseExistingServer: true,
  },
})
