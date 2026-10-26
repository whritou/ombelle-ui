import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { selectFamily } from './scenarios'
if (window.location.pathname === '/editor-preview/' || window.location.pathname === '/editor-preview') {
  const { mountEditorPreview } = await import('./editor-preview')
  mountEditorPreview(document.getElementById('root')!)
} else {
  const family = selectFamily(window.location.pathname)
  const entries = {
    flat: () => import('./generated/flat/entry'),
    minimalist: () => import('./generated/minimalist/entry'),
    'neo-brutalism': () => import('./generated/neo-brutalism/entry'),
  }
  if (family) {
    const { default: Scenario } = await entries[family]()
    createRoot(document.getElementById('root')!).render(<Scenario />)
  } else {
    createRoot(document.getElementById('root')!).render(<main><h1>Unknown style family</h1><p>Choose flat, minimalist, or neo brutalism.</p></main>)
  }
}
