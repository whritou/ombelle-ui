import { defineConfig } from '@playwright/test'
import { workerBudget } from './scripts/worker-budget.js'
import { specimenShard, specimenSpecFiles } from './tests/helpers/specimen-shard.js'

// The specimen audit needs the generated preview audit pages only, not consumers.
// Run pnpm build:packages and pnpm generate:preview first.
//
// Every test runs in parallel: one audit configuration takes minutes, so a file's tests
// must not queue in one worker. OMBELLE_SPECIMEN_SHARD=2/4 runs one shard: its share of
// the audit configurations (round robin) and of the other spec files (by file), so the
// Foundation workflow can spread the audit across jobs. The aggregate requires every shard.
const shard = specimenShard()
// Never attach to a server that is already listening: it may be another checkout's
// preview (TST-10). Pick a free port for parallel checkouts with OMBELLE_SPECIMEN_PORT.
const port = Number(process.env.OMBELLE_SPECIMEN_PORT || 4185)
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: shard ? specimenSpecFiles.filter((file, index) => file === 'specimen-audit.spec.ts' || index % shard.total === shard.current - 1) : specimenSpecFiles,
  // An audit configuration sets its own, longer timeout; every other test is an interaction test.
  timeout: 120000,
  expect: { timeout: 10000 },
  fullyParallel: true,
  workers: workerBudget('OMBELLE_SPECIMEN_WORKERS', process.env.OMBELLE_SPECIMEN_WORKERS, 4),
  retries: 0,
  globalSetup: './tests/e2e/specimen-audit.setup.ts',
  globalTeardown: './tests/e2e/specimen-audit.teardown.ts',
  use: {
    browserName: 'chromium',
    channel: process.env.OMBELLE_BROWSER_CHANNEL || undefined,
    baseURL: `http://127.0.0.1:${port}`,
    headless: true,
    viewport: { width: 1100, height: 800 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  reporter: [['list'], ['json', { outputFile: '.artifacts/specimen-results.json' }]],
  webServer: {
    command: `node node_modules/vite/bin/vite.js apps/preview --config apps/preview/vite.config.ts --port ${port} --strictPort --host 127.0.0.1`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 120000,
  },
})
