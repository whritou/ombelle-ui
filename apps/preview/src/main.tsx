import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { selectFamily } from './scenarios'
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
