import type { NextConfig } from 'next'
import { headerRules } from './src/security-headers'

const nextConfig: NextConfig = {
  async rewrites() {
    const previews = ['editor', 'preset', 'block'].map(kind => ({
      source: `/ombelle-preview/${kind}-preview`,
      destination: `/ombelle-preview/${kind}-preview/index.html`,
    }))
    // Markdown versions of the component, block and guide pages, for coding agents. The patterns only
    // match ids ending in .md, so the HTML pages at /components/:id are untouched.
    const markdown = ['components', 'blocks', 'docs'].map(kind => ({
      source: `/${kind}/:id([a-z0-9-]+)\\.md`,
      destination: `/md/${kind}/:id`,
    }))
    return [...previews, ...markdown]
  },
  async headers() {
    return headerRules(process.env.NEXT_PUBLIC_OMBELLE_PREVIEW_ORIGIN)
  },
  turbopack: {
    resolveAlias: {
      '@ombelle/contracts': '../../packages/contracts/dist/index.js',
      '@ombelle/catalog/presets': '../../packages/catalog/dist/presets.js',
      '@ombelle/catalog/expansion-examples': '../../packages/catalog/dist/expansion-examples.js',
      '@ombelle/compiler/light': '../../packages/compiler/dist/light.js',
      '@ombelle/catalog': '../../packages/catalog/dist/index.js',
      '@ombelle/compiler': '../../packages/compiler/dist/index.js',
    },
  },
}

export default nextConfig
