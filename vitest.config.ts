import { defineConfig } from 'vitest/config'
import { workerBudget } from './scripts/worker-budget.js'
// Catalog templates import a colocated stylesheet that only exists once the
// component is installed, so tests that render them get an empty module.
const stubId = '\0ombelle-template-stylesheet-stub'
const templateStylesheetStub = {
  name: 'ombelle-template-stylesheet-stub',
  enforce: 'pre' as const,
  resolveId(id: string, importer?: string) {
    if (
      id.endsWith('.css') &&
      importer
        ?.replace(/\\/g, '/')
        .includes('/packages/catalog/src/templates/')
    )
      return stubId
  },
  load(id: string) {
    if (id === stubId) return 'export default {}'
  },
}
export default defineConfig({
  plugins: [templateStylesheetStub],
  test: {
    // Compiler tests also spawn tsc processes; CPU count alone overcommits memory.
    maxWorkers: workerBudget('OMBELLE_TEST_WORKERS', process.env.OMBELLE_TEST_WORKERS, 4),
    include: [
      'packages/**/*.test.ts',
      'packages/**/*.test.tsx',
      'apps/www/src/**/*.test.ts',
      'apps/www/src/**/*.test.tsx',
      'tests/integration/**/*.test.ts',
    ],
    testTimeout: 60000,
    hookTimeout: 60000,
  },
  resolve: {
    alias: {
      // Subpath entries first: an alias also matches its key followed by a slash.
      '@ombelle/catalog/presets': new URL(
        './packages/catalog/src/presets.ts',
        import.meta.url,
      ).pathname.replace(/^\/(\w:)/, '$1'),
      '@ombelle/catalog/expansion-examples': new URL(
        './packages/catalog/src/expansion-examples.ts',
        import.meta.url,
      ).pathname.replace(/^\/(\w:)/, '$1'),
      '@ombelle/compiler/light': new URL(
        './packages/compiler/src/light.ts',
        import.meta.url,
      ).pathname.replace(/^\/(\w:)/, '$1'),
      '@ombelle/contracts': new URL(
        './packages/contracts/src/index.ts',
        import.meta.url,
      ).pathname.replace(/^\/(\w:)/, '$1'),
      '@ombelle/catalog': new URL(
        './packages/catalog/src/index.ts',
        import.meta.url,
      ).pathname.replace(/^\/(\w:)/, '$1'),
      '@ombelle/compiler': new URL(
        './packages/compiler/src/index.ts',
        import.meta.url,
      ).pathname.replace(/^\/(\w:)/, '$1'),
    },
  },
})
