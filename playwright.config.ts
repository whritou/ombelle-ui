import { defineConfig } from '@playwright/test'
import fs from 'node:fs'
import { workerBudget } from './scripts/worker-budget.js'
const fixtures = JSON.parse(
  fs.readFileSync('.artifacts/consumers.json', 'utf8'),
) as Record<string, { port: number }>
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60000,
  expect: { timeout: 10000 },
  workers: workerBudget('OMBELLE_E2E_WORKERS', process.env.OMBELLE_E2E_WORKERS, 2),
  fullyParallel: false,
  retries: 0,
  use: {
    browserName: 'chromium',
    channel: process.env.OMBELLE_BROWSER_CHANNEL || undefined,
    headless: true,
    viewport: { width: 1100, height: 800 },
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  reporter: [
    ['list'],
    ['json', { outputFile: '.artifacts/browser-results.json' }],
    ['html', { open: 'never' }],
  ],
  webServer: [
    {
      command: 'pnpm dev:preview',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: false,
    },
    ...Object.entries(fixtures).filter(([id]) => !id.startsWith('yarn-') && !id.startsWith('bun-')).map(([id, f]) => ({
      command: 'pnpm exec tsx scripts/serve-consumer.ts ' + id,
      url: 'http://127.0.0.1:' + f.port,
      reuseExistingServer: false,
      timeout: 120000,
    })),
  ],
})
