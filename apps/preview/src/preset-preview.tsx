import * as React from 'react'
import { createRoot } from 'react-dom/client'
import {
  isPresetHandshake,
  verifyPresetRender,
  verifyGallerySources,
  presetRuntimeStyles,
  type PresetRender,
} from '../../www/src/preset-editor/preview-protocol'
import { PresetGallery } from './generated/preset-gallery/gallery'
import { LiquidGlassFilter } from './generated/preset-gallery/components/ui/liquid-glass-filter'
import manifest from './generated/preset-gallery/manifest'
import { gallerySources } from './generated/preset-gallery/sources'
import { PresetScenePage } from './scenes'
import './preset-preview.css'
import { supportedComponentIds } from '../../../packages/contracts/src/component-ids.js'
import {
  styleSupport,
  type StyleFamily,
} from '../../../packages/contracts/src/style-families.js'

// Placeholders come from the shared support table at runtime, so the gallery
// source stays identical across families.
const unavailableIds = (family: StyleFamily) =>
  supportedComponentIds.filter((id) => styleSupport(id, family) === 'unavailable')

function PresetPreview() {
  const [current, setCurrent] = React.useState<{
    message: PresetRender
    port: MessagePort
  } | null>(null)
  const attached = React.useRef<MessagePort | null>(null),
    lastId = React.useRef(0)
  React.useEffect(() => {
    const parentOrigin = document.referrer
      ? new URL(document.referrer).origin
      : null
    const sourceCheck = verifyGallerySources(manifest, gallerySources)
    const announce = () => {
      if (!attached.current)
        window.parent.postMessage(
          { type: 'ombelle-preset-preview-ready', version: 1 },
          '*',
        )
    }
    const retry = setInterval(announce, 150)
    function initialize(event: MessageEvent<unknown>) {
      if (
        event.source !== window.parent ||
        event.origin !== parentOrigin ||
        !isPresetHandshake(event.data, 'init') ||
        event.ports.length !== 1
      )
        return
      attached.current?.close()
      lastId.current = 0
      const port = event.ports[0]
      attached.current = port
      port.onmessage = async (event: MessageEvent<unknown>) => {
        const accepted = await verifyPresetRender(
          event.data,
          lastId.current,
          manifest,
        )
        const sourcesValid = await sourceCheck
        if (attached.current !== port) return
        if (
          !accepted ||
          !sourcesValid ||
          accepted.requestId <= lastId.current
        ) {
          const rejected = event.data as Partial<PresetRender> | null
          if (
            typeof rejected?.requestId === 'number' &&
            typeof rejected.result?.preset?.hash === 'string'
          )
            port.postMessage({
              type: 'preset-render-ack',
              requestId: rejected.requestId,
              presetHash: rejected.result.preset.hash,
              status: 'rejected',
            })
          return
        }
        lastId.current = accepted.requestId
        setCurrent({ message: accepted, port })
      }
      port.start()
    }
    window.addEventListener('message', initialize)
    announce()
    return () => {
      clearInterval(retry)
      window.removeEventListener('message', initialize)
      attached.current?.close()
      attached.current = null
    }
  }, [])
  React.useLayoutEffect(() => {
    if (
      !current ||
      current.port !== attached.current ||
      current.message.requestId !== lastId.current
    )
      return
    document.documentElement.classList.toggle(
      'dark',
      current.message.view.mode === 'dark',
    )
    // The gallery is shared with consumer parity fixtures, so focus hides the
    // other sections instead of rendering a different tree.
    const focus = current.message.view.focus
    const gallery = document.querySelector<HTMLElement>('[data-testid="preset-gallery"]')
    for (const child of Array.from(gallery?.children ?? []) as HTMLElement[]) {
      const own = child.dataset.component
      child.hidden = Boolean(focus) && own !== focus && !child.querySelector(`[data-component="${focus}"]`)
      if (!own)
        for (const part of Array.from(child.querySelectorAll<HTMLElement>(':scope > [data-component]')))
          // Labels stay so focused form controls keep their accessible names.
          part.hidden = Boolean(focus) && part.dataset.component !== focus && part.dataset.component !== 'label'
    }
    const scene = current.message.view.scene ?? 'gallery'
    document.documentElement.dataset.scene = scene
    if (current.message.result.preset.data.styleFamily === 'liquid-glass')
      document.documentElement.dataset.backdrop = 'photo'
    else delete document.documentElement.dataset.backdrop
    if (focus) document.documentElement.dataset.focus = focus
    else delete document.documentElement.dataset.focus
    document.documentElement.dataset.presetHash =
      current.message.result.preset.hash
    document.documentElement.dataset.presetRequest = String(
      current.message.requestId,
    )
    current.port.postMessage({
      type: 'preset-render-ack',
      requestId: current.message.requestId,
      presetHash: current.message.result.preset.hash,
      status: 'applied',
    })
  }, [current])
  const family = current?.message.result.preset.data.styleFamily
  const scene = current?.message.view.scene ?? 'gallery'
  const sceneProps = family
    ? {
        unavailable: unavailableIds(family),
        familyLabel: family.replaceAll('-', ' '),
      }
    : { unavailable: [], familyLabel: '' }
  return current ? (
    <>
      <style data-preset-styles>
        {presetRuntimeStyles(current.message.result)}
      </style>
      {family === 'liquid-glass' && <LiquidGlassFilter />}
      {scene === 'gallery' ? (
        <PresetGallery {...sceneProps} />
      ) : (
        <PresetScenePage scene={scene} {...sceneProps} />
      )}
    </>
  ) : (
    <p role="status">Waiting for a valid preset…</p>
  )
}
export function mountPresetPreview(element: HTMLElement) {
  createRoot(element).render(<PresetPreview />)
}
