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
import { GlassBackdropArt, setGlassBackdrop } from './glass-backdrop-art'
import { startReducedTransparencyMirror } from './reduced-transparency-mirror'
import { GlassControlHalo } from './glass-control-halo'
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
      if (!own) {
        const parts = Array.from(child.querySelectorAll<HTMLElement>(':scope > [data-component]'))
        const shown = parts.find((part) => part.dataset.component === focus)
        for (const part of parts)
          // A standalone label stays only when it names the focused control, so
          // that control keeps its accessible name without orphan labels around it.
          part.hidden = Boolean(focus) && part !== shown && !(
            part.dataset.component === 'label' && (focus === 'label' || labelsInside(part, shown))
          )
      }
    }
    const scene = current.message.view.scene ?? 'gallery'
    document.documentElement.dataset.scene = scene
    const backdrop = current.message.view.backdrop ?? 'kit'
    if (current.message.result.preset.data.styleFamily === 'liquid-glass')
      setGlassBackdrop(document.documentElement, backdrop, current.message.view.labInk ?? null)
    else setGlassBackdrop(document.documentElement, undefined)
    // The editors' "Preview transparency" toggle; the mirror holds the rules it switches on.
    document.documentElement.toggleAttribute('data-reduced-transparency', current.message.view.reducedTransparency === true)
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
  const design = current?.message.result.preset.data.design
  const glassFilterKey = [
    design?.transparency,
    design?.glassRefraction,
    design?.glassRefractionWidth,
    Boolean(design?.glassHalo || design?.glassMotion),
  ].join(':')
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
      {family === 'liquid-glass' && <LiquidGlassFilter key={glassFilterKey} />}
      {family === 'liquid-glass' && <GlassBackdropArt scene={current.message.view.backdrop ?? 'kit'} />}
      {family === 'liquid-glass' && <GlassControlHalo enabled={design?.transparency !== 'reduced' && (design?.glassHalo ?? 0) > 0} />}
      {scene === 'gallery' ? (
        <PresetGallery {...sceneProps} />
      ) : (
        <PresetScenePage scene={scene} {...sceneProps} />
      )}
    </>
  ) : (
    <div className="preset-preview-waiting" role="status">
      <span className="preset-preview-waiting__spinner" aria-hidden="true" />
      <span>Loading preview…</span>
    </div>
  )
}
function labelsInside(part: HTMLElement, shown: HTMLElement | undefined) {
  if (!shown) return false
  return Array.from(part.querySelectorAll('label')).some(
    (label) => label.htmlFor !== '' && shown.querySelector(`#${CSS.escape(label.htmlFor)}`) !== null,
  )
}
export function mountPresetPreview(element: HTMLElement) {
  startReducedTransparencyMirror(document)
  createRoot(element).render(<PresetPreview />)
}
