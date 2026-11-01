import { defineConfig } from 'vitest/config'
import base from './vitest.config.js'

export default defineConfig({
  ...base,
  test: { ...base.test, include: ['tests/hosted/**/*.test.ts'], maxWorkers: 1, testTimeout: 60_000, hookTimeout: 120_000 },
})
