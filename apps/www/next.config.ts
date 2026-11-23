import type { NextConfig } from 'next'
import { headerRules } from './src/security-headers'

const nextConfig: NextConfig = {
  async rewrites() {
    return ['editor', 'preset'].map(kind => ({
      source: `/ombelle-preview/${kind}-preview`,
      destination: `/ombelle-preview/${kind}-preview/index.html`,
    }))
  },
  async headers() {
    return headerRules(process.env.NEXT_PUBLIC_OMBELLE_PREVIEW_ORIGIN)
  },
  turbopack: {
    resolveAlias: {
      '@ombelle/contracts': '../../packages/contracts/dist/index.js',
      '@ombelle/catalog': '../../packages/catalog/dist/index.js',
      '@ombelle/compiler': '../../packages/compiler/dist/index.js',
    },
  },
}

export default nextConfig
