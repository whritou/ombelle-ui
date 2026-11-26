'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { BlockId, StyleFamily } from '@ombelle/contracts'
import { previewFrameUrl } from '../../editor/preview-url'

/**
 * The preview app's page for one block in one family. The mode is the hash: changing it restyles the open page
 * without a reload, while a family change loads the page again with that family's stylesheet.
 */
export function blockFrameSrc(id: BlockId, family: StyleFamily, mode: 'light' | 'dark'): string {
  const page = previewFrameUrl('block', process.env.NEXT_PUBLIC_OMBELLE_PREVIEW_ORIGIN)
  return `${page}?block=${id}&family=${family}#${mode}`
}

/** The height a block page reports, within these bounds: room for its dialogs, and far above the tallest block (dashboard-01 at 375 px, about 1540 px). */
const minHeight = 560, maxHeight = 4000

/**
 * A block rendered at a real viewport width in the sandboxed preview frame. The frame reports its content height,
 * so the block shows whole at every width; `width` is a pixel width or the full column.
 */
export function BlockFrame({ id, family, mode, title, width, initialHeight }: {
  id: BlockId
  family: StyleFamily
  mode: 'light' | 'dark'
  title: string
  width: number | 'full'
  initialHeight: number
}) {
  const frame = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(initialHeight)
  useEffect(() => {
    const onMessage = (event: MessageEvent<unknown>) => {
      if (event.source !== frame.current?.contentWindow) return
      const data = event.data as { type?: unknown; height?: unknown }
      if (data?.type === 'ombelle-block-size' && typeof data.height === 'number' && Number.isFinite(data.height))
        setHeight(Math.min(maxHeight, Math.max(minHeight, Math.ceil(data.height))))
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])
  const style: CSSProperties = {
    display: 'block',
    width: width === 'full' ? '100%' : `${width}px`,
    maxWidth: '100%',
    height: `${height}px`,
    marginInline: 'auto',
    border: 0,
  }
  return (
    <iframe
      ref={frame}
      data-block-preview=""
      title={title}
      src={blockFrameSrc(id, family, mode)}
      // Scripts run the block, and forms let its example submit reach its own handler; the frame has no other access.
      sandbox="allow-scripts allow-forms"
      style={style}
    />
  )
}
