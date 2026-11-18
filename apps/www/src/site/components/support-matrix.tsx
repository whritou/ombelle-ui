'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { styleFamilies, styleSupport } from '@ombelle/contracts'
import { componentDocs } from './catalog'
import { familyHeadings } from '../families'

const labels = { stable: 'Stable', experimental: 'Experimental', unavailable: 'Unavailable' }

// Sorting, filtering and column choices load only once the matrix is opened, so they add nothing to the page's first load.
const MatrixTable = dynamic(() => import('./matrix-table'), { ssr: false })

export function SupportMatrix() {
  const [open, setOpen] = useState(false)
  return (
    <details className="mt-8 rounded-xl border border-border bg-card p-4" onToggle={event => setOpen(event.currentTarget.open)}>
      <summary className="cursor-pointer font-semibold">Component support by style family</summary>
      <p className="mt-3 text-sm text-muted-foreground">Stable components follow the reviewed family contract. Experimental components may change. Unavailable combinations cannot be installed.</p>
      {open ? <div className="mt-4"><MatrixTable /></div> : <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Support for every catalog component in each style family</caption>
          <thead><tr><th scope="col" className="p-2">Component</th>{styleFamilies.map(family => <th scope="col" key={family} className="p-2">{family === 'liquid-glass' ? 'Liquid Glass' : familyHeadings[family]}</th>)}</tr></thead>
          <tbody>{componentDocs.map(doc => <tr key={doc.id} className="border-t border-border">
            <th scope="row" className="p-2 font-medium"><a href={`/components/${doc.id}`} className="underline underline-offset-4">{doc.name}</a></th>
            {styleFamilies.map(family => <td key={family} className="p-2">{labels[styleSupport(doc.id, family)]}</td>)}
          </tr>)}</tbody>
        </table>
      </div>}
    </details>
  )
}
