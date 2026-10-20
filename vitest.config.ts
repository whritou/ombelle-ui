import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    include: [
      'packages/**/*.test.ts',
      'packages/**/*.test.tsx',
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
