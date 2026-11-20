'use client'

import * as React from 'react'
// Ombelle is the family the page renders first, so its fonts are part of the page CSS, served from a fixed
// public path the page preloads; other families load theirs on pick (family-fonts.ts).
import '../generated/previews/fonts.css'
import { ombelleFontPreloads } from '../generated/previews/fonts'
import { componentsWithStyleSupport, type ComponentId } from '@ombelle/contracts'
import { inlineSpecimens, specimenOnly } from '../generated/previews'
import { GalleryGate, Unavailable } from '../generated/previews/specimens/shared'
import { componentDocs } from '../site/components/catalog'
import { familyHeadings } from '../site/families'
import { PreviewPortalContainer } from './preview-portal'
import { clientOnly, previewStylesheets, type BuiltInFamily } from './routing'

type InlinePreviewProps = {
  id: ComponentId
  family: BuiltInFamily
  mode: 'auto' | 'light' | 'dark'
  height: number
}

/** A component specimen rendered in place, scoped to one family by the stage's data attributes. */
export function InlinePreview({ id, family, mode, height }: InlinePreviewProps) {
  // A callback ref in state, so portal consumers re-render once the stage exists.
  const [stage, setStage] = React.useState<HTMLElement | null>(null)
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const [base, own] = previewStylesheets(family, id)
  // The faces this specimen shows, fetched with the page instead of after layout. React hoists these links into the
  // head and matches them on hydration; `preload()` would be sent as a Link header and requested again by the client.
  const fonts = family === 'ombelle' ? (ombelleFontPreloads[id] ?? []) : []
  const familyLabel = familyHeadings[family]
  const gate = React.useMemo(
    () => ({ unavailable: componentsWithStyleSupport(family, ['unavailable']), familyLabel }),
    [family, familyLabel],
  )
  const Specimen = inlineSpecimens[id]
  const deferred = clientOnly.has(id) && !mounted

  let content: React.ReactNode
  if (deferred) {
    content = <div data-preview-skeleton="" style={{ height }} aria-hidden="true" />
  } else if (gate.unavailable.includes(id)) {
    const name = componentDocs.find((doc) => doc.id === id)?.name ?? id
    content = <Unavailable id={id} name={name} familyLabel={familyLabel} />
  } else {
    content = <Specimen only={specimenOnly[id]} />
  }

  return (
    <div
      ref={setStage}
      data-preview-family={family}
      data-preview-mode={mode}
      data-focus={id}
      style={{ height, overflow: 'auto' }}
    >
      <link rel="stylesheet" href={base} precedence="ombelle-preview" />
      <link rel="stylesheet" href={own} precedence="ombelle-preview" />
      {fonts.map((href) => (
        <link key={href} rel="preload" href={href} as="font" type="font/woff2" crossOrigin="anonymous" />
      ))}
      <PreviewPortalContainer.Provider value={stage}>
        <GalleryGate.Provider value={gate}>
          <div className="preset-gallery">{content}</div>
        </GalleryGate.Provider>
      </PreviewPortalContainer.Provider>
    </div>
  )
}
