'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { styleFamilies, styleSupport } from '@ombelle/contracts'
import { componentDocs } from './catalog'
import { familyColumnTitle, supportLabels } from './matrix-labels'

/** The plain matrix: the server and no-JavaScript rendering, and what shows while the Data Table loads. */
function StaticMatrix() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Support for every catalog component in each style family</caption>
        <thead><tr><th scope="col" className="p-2">Component</th>{styleFamilies.map(family => <th scope="col" key={family} className="p-2">{familyColumnTitle(family)}</th>)}</tr></thead>
        <tbody>{componentDocs.map(doc => <tr key={doc.id} className="border-t border-border">
          <th scope="row" className="p-2 font-medium"><a href={`/components/${doc.id}`} className="underline underline-offset-4">{doc.name}</a></th>
          {styleFamilies.map(family => <td key={family} className="p-2">{supportLabels[styleSupport(doc.id, family)]}</td>)}
        </tr>)}</tbody>
      </table>
    </div>
  )
}

// Sorting, filtering and column choices load only once the matrix is opened, so they add nothing to the page's first load.
const MatrixTable = dynamic(() => import('./matrix-table'), { ssr: false, loading: () => <StaticMatrix /> })

export function SupportMatrix() {
  const [open, setOpen] = useState(false)
  return (
    <details className="mt-8 rounded-xl border border-border bg-card p-4" onToggle={event => setOpen(event.currentTarget.open)}>
      <summary className="cursor-pointer font-semibold">Component support by style family</summary>
      <p className="mt-3 text-sm text-muted-foreground">Stable components follow the reviewed family contract. Liquid glass is stable with one caveat: accessibility is not guaranteed, because its text contrast depends on the background behind it. Unavailable combinations cannot be installed.</p>
      <div className="mt-4">{open ? <MatrixTable /> : <StaticMatrix />}</div>
    </details>
  )
}
