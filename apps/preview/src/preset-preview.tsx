import * as React from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import {
  isPresetHandshake,
  verifyPresetRender,
  verifyPresetTokens,
  verifyGallerySources,
} from '../../www/src/preset-editor/preview-protocol'
import {
  createPresetReceiver,
  type ReceivedPreset,
} from '../../www/src/preset-editor/preview-receiver'
import { PresetGallery } from './generated/preset-gallery/gallery'
import { LiquidGlassFilter } from './generated/preset-gallery/components/ui/liquid-glass-filter'
import manifest from './generated/preset-gallery/manifest'
import { gallerySources } from './generated/preset-gallery/sources'
import { PresetScenePage } from './scenes'
import { GlassBackdropArt, setGlassBackdrop } from './glass-backdrop-art'
import { startReducedTransparencyMirror } from './reduced-transparency-mirror'
import { GlassControlHalo } from './glass-control-halo'
import { loadPresetFonts, presetFontIds } from './preset-fonts'
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
  const [current, setCurrent] = React.useState<ReceivedPreset | null>(null)
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
      const receiver = createPresetReceiver({
        port,
        verifyRender: (data, previous) =>
          verifyPresetRender(data, previous, manifest),
        verifyTokens: verifyPresetTokens,
        sourcesValid: sourceCheck,
        isCurrentPort: () => attached.current === port,
        // Flushed so the applied ack follows the committed DOM changes.
        apply: (state) => {
          lastId.current = state.requestId
          flushSync(() => setCurrent(state))
        },
        post: (ack) => port.postMessage(ack),
      })
      port.onmessage = (event: MessageEvent<unknown>) =>
        void receiver.receive(event.data)
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
      current.requestId !== lastId.current
    )
      return
    document.documentElement.classList.toggle(
      'dark',
      current.view.mode === 'dark',
    )
    // The gallery is shared with consumer parity fixtures, so focus hides the
    // other sections instead of rendering a different tree.
    const focus = current.view.focus
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
    const scene = current.view.scene ?? 'gallery'
    document.documentElement.dataset.scene = scene
    const backdrop = current.view.backdrop ?? 'kit'
    if (current.family === 'liquid-glass')
      setGlassBackdrop(document.documentElement, backdrop, current.view.labInk ?? null)
    else setGlassBackdrop(document.documentElement, undefined)
    // The editors' "Preview transparency" toggle; the mirror holds the rules it switches on.
    document.documentElement.toggleAttribute('data-reduced-transparency', current.view.reducedTransparency === true)
    if (focus) document.documentElement.dataset.focus = focus
    else delete document.documentElement.dataset.focus
    document.documentElement.dataset.presetHash = current.hash
    document.documentElement.dataset.presetRequest = String(current.requestId)
  }, [current])
  const family = current?.family
  const design = current?.design
  // Only the fonts the previewed preset uses are fetched, and each is fetched once.
  const fontKey = design ? presetFontIds(design).join(',') : ''
  React.useEffect(() => {
    if (fontKey) void loadPresetFonts(fontKey.split(','))
  }, [fontKey])
  const glassFilterKey = [
    design?.transparency,
    design?.glassRefraction,
    design?.glassRefractionWidth,
    Boolean(design?.glassHalo || design?.glassMotion),
  ].join(':')
  const scene = current?.view.scene ?? 'gallery'
  // The page depends only on the family and the scene: a token edit changes the style
  // text alone, so the same element lets React skip the page (and its layout reads).
  const page = React.useMemo(() => {
    const sceneProps = family
      ? {
          unavailable: unavailableIds(family),
          familyLabel: family.replaceAll('-', ' '),
        }
      : { unavailable: [], familyLabel: '' }
    return scene === 'gallery' ? (
      <PresetGallery {...sceneProps} />
    ) : (
      <PresetScenePage scene={scene} {...sceneProps} />
    )
  }, [family, scene])
  return current ? (
    <>
      <style data-preset-styles>
        {current.css}
      </style>
      {family === 'liquid-glass' && <LiquidGlassFilter key={glassFilterKey} />}
      {family === 'liquid-glass' && <GlassBackdropArt scene={current.view.backdrop ?? 'kit'} />}
      {family === 'liquid-glass' && <GlassControlHalo enabled={design?.transparency !== 'reduced' && (design?.glassHalo ?? 0) > 0} />}
      {page}
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
