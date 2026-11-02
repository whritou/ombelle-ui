import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: 'tests/e2e', testMatch: ['editor.spec.ts', 'preset-editor.spec.ts', 'recipe-snapshots.spec.ts'],
  timeout: 60_000, expect: { timeout: 10_000 }, workers: 1, retries: 0,
  use: { browserName: 'chromium', channel: process.env.OMBELLE_BROWSER_CHANNEL || undefined, headless: true, viewport: { width: 1100, height: 800 }, reducedMotion: 'reduce', trace: 'retain-on-failure' },
  reporter: [['list'], ['json', { outputFile: '.artifacts/preview-dev-browser-results.json' }]],
  webServer: [
    { command: 'node --import tsx scripts/serve-snapshot-www.ts', url: 'http://127.0.0.1:3000/editor/component/button', reuseExistingServer: false, timeout: 120_000 },
    { command: 'node node_modules/vite/bin/vite.js apps/preview --config apps/preview/vite.config.ts', url: 'http://127.0.0.1:4173', reuseExistingServer: false },
  ],
})
