import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { selectFamily } from './scenarios'
const family = selectFamily(window.location.pathname)
const { default: Scenario } = await (family === 'flat'
  ? import('./generated/flat/entry')
  : import('./generated/neo-brutalism/entry'))
createRoot(document.getElementById('root')!).render(<Scenario />)
