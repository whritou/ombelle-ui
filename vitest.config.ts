import { defineConfig } from 'vitest/config'
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
    include: [
      'packages/**/*.test.ts',
      'packages/**/*.test.tsx',
      'apps/www/src/**/*.test.ts',
      'apps/www/src/**/*.test.tsx',
      'tests/integration/**/*.test.ts',
    ],
    testTimeout: 60000,
  },
  resolve: {
    alias: {
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
