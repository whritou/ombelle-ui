import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async rewrites() {
    return ['editor', 'preset'].map(kind => ({
      source: `/ombelle-preview/${kind}-preview`,
      destination: `/ombelle-preview/${kind}-preview/index.html`,
    }))
  },
  async headers() {
    return [{
      source: '/ombelle-preview/:path*',
      // Module imports from the opaque sandbox have Origin: null. These are
      // public static files; publication APIs retain their same-origin policy.
      headers: [
        { key: 'Access-Control-Allow-Origin', value: '*' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
      ],
    }]
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
