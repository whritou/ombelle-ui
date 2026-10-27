import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      '@ombelle/contracts': '../../packages/contracts/dist/index.js',
      '@ombelle/catalog': '../../packages/catalog/dist/index.js',
      '@ombelle/compiler': '../../packages/compiler/dist/index.js',
    },
  },
}

export default nextConfig
