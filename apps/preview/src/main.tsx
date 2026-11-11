import * as React from 'react'
import { createRoot } from 'react-dom/client'
import type { StyleFamily } from '../../../packages/contracts/src/style-families.js'
import { selectFamily } from './scenarios'
const previewPath = window.location.pathname.replace(/^\/ombelle-preview(?=\/)/, '')
if (previewPath === '/preset-preview/' || previewPath === '/preset-preview') {
  const { mountPresetPreview } = await import('./preset-preview')
  mountPresetPreview(document.getElementById('root')!)
} else if (previewPath === '/editor-preview/' || previewPath === '/editor-preview') {
  const { mountEditorPreview } = await import('./editor-preview')
  mountEditorPreview(document.getElementById('root')!)
} else if (/^\/audit\/[^/]+\/(?:radix|base)\/?$/.test(previewPath)) {
  // Specimen audit pages: /audit/<family>/<radix|base>/?mode=light|dark
  const [, , family, edition] = previewPath.split('/')
  const { mountAuditPage } = await import('./audit-page')
  await mountAuditPage(document.getElementById('root')!, family, edition as 'radix' | 'base')
} else if (/^\/editions\/[^/]+\/(?:radix|base)\/?$/.test(previewPath)) {
  // Edition parity pages: /editions/<family>/<radix|base>/
  const [, , family, edition] = previewPath.split('/')
  const pages = import.meta.glob<{ default: React.ComponentType }>('./generated/editions/*/entry.tsx')
  const load = pages['./generated/editions/' + family + '-' + edition + '/entry.tsx']
  const root = createRoot(document.getElementById('root')!)
  if (load) {
    const { default: Scenario } = await load()
    root.render(<Scenario />)
  } else root.render(<main><h1>Unknown edition page</h1></main>)
} else {
  const family = selectFamily(window.location.pathname)
  const entries: Record<StyleFamily, () => Promise<{ default: React.ComponentType }>> = {
    flat: () => import('./generated/flat/entry'),
    minimalist: () => import('./generated/minimalist/entry'),
    'neo-brutalism': () => import('./generated/neo-brutalism/entry'),
    ombelle: () => import('./generated/ombelle/entry'),
    'liquid-glass': () => import('./generated/liquid-glass/entry'),
  }
  const load = family ? entries[family] : undefined
  if (load) {
    const { default: Scenario } = await load()
    createRoot(document.getElementById('root')!).render(<Scenario />)
  } else {
    createRoot(document.getElementById('root')!).render(<main><h1>Unknown style family</h1><p>Choose flat, minimalist, neo brutalism, ombelle, or liquid glass.</p></main>)
  }
}
