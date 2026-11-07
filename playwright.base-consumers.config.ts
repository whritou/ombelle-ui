import { defineConfig } from '@playwright/test'
import fs from 'node:fs'
// Serves the production builds made by scripts/prepare-base-consumers.ts.
const consumers = JSON.parse(
  fs.readFileSync('.artifacts/base-consumers.json', 'utf8'),
) as { id: string; framework: 'vite' | 'next'; port: number; root: string }[]
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: 'base-consumers.spec.ts',
  timeout: 60000,
  workers: 1,
  retries: 0,
  use: { browserName: 'chromium', headless: true, viewport: { width: 1100, height: 800 }, reducedMotion: 'reduce' },
  reporter: [['list']],
  webServer: consumers.map((c) => ({
    command:
      c.framework === 'next'
        ? 'pnpm exec next start -H 127.0.0.1 -p ' + c.port
        : 'pnpm exec vite preview --host 127.0.0.1 --strictPort --port ' + c.port,
    cwd: c.root,
    url: 'http://127.0.0.1:' + c.port,
    reuseExistingServer: false,
    timeout: 120000,
  })),
})
