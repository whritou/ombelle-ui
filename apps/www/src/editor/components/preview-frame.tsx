'use client'

import { useEffect, useRef } from 'react'
import type { InstallableRecipeCompileResult, ComponentRecipe } from '@ombelle/contracts'
import type { EditorView } from '../model'
import { isPreviewAck, isPreviewReady, verifyPreviewCompileResult, type PreviewRender } from '../preview-protocol'
import { previewFrameUrl } from '../preview-url'
import { acceptButtonMeasure, acceptCatalogMeasure, verifyCatalogCompileResult, type CatalogPreviewRender, type MeasuredParts } from '../catalog-preview-protocol'

export function PreviewFrame({ result, view, component, componentName = 'Button', onMeasure }: {
  result: InstallableRecipeCompileResult | null; view: EditorView
  component?: ComponentRecipe['component']; componentName?: string
  /** Receives the rendered part dimensions of the latest render; the Button reports its 'button' slot. */
  onMeasure?(parts: MeasuredParts): void
}) {
  const iframe = useRef<HTMLIFrameElement>(null)
  const port = useRef<MessagePort | null>(null)
  const latest = useRef({ result, view })
  const nextRequestId = useRef(0)
  const sendEpoch = useRef(0)
  const lastAck = useRef(0)
  latest.current = { result, view }
  const measured = useRef(onMeasure)
  measured.current = onMeasure

  async function sendCurrent(targetPort: MessagePort) {
    const epoch = ++sendEpoch.current
    const current = latest.current
    if (component) {
      const result = await verifyCatalogCompileResult(current.result, component)
      if (epoch !== sendEpoch.current || targetPort !== port.current || !result) return
      const message: CatalogPreviewRender = {
        type: 'catalog-render', component, requestId: ++nextRequestId.current,
        result, mode: current.view.mode, viewport: current.view.viewport,
      }
      targetPort.postMessage(message)
      return
    }
    const compiled = await verifyPreviewCompileResult(current.result)
    if (epoch !== sendEpoch.current || targetPort !== port.current || !compiled) return
    const css = compiled.artifacts.find((artifact) => artifact.kind === 'style')?.content
    if (!css) return
    const requestId = ++nextRequestId.current
    const message: PreviewRender = {
      type: 'render', requestId, scope: compiled.scope,
      state: { recipe: compiled.recipe.data, css, mode: current.view.mode,
        viewport: current.view.viewport, forcedState: current.view.forcedState, requestId },
    }
    targetPort.postMessage(message)
  }

  useEffect(() => {
    function onReady(event: MessageEvent<unknown>) {
      if (event.source !== iframe.current?.contentWindow || event.origin !== 'null' ||
        !isPreviewReady(event.data)) return
      port.current?.close()
      const channel = new MessageChannel()
      port.current = channel.port1
      lastAck.current = 0
      channel.port1.onmessage = (ack: MessageEvent<unknown>) => {
        if (port.current !== channel.port1) return
        const measure = component ? acceptCatalogMeasure(ack.data, component) : null
        if (measure) {
          // Only the render the preview applied last describes the current recipe.
          if (measure.requestId === lastAck.current) measured.current?.(measure.parts)
          return
        }
        const button = component ? null : acceptButtonMeasure(ack.data)
        if (button) {
          if (button.requestId === lastAck.current) measured.current?.({ button: button.values })
          return
        }
        if (port.current !== channel.port1 || !isPreviewAck(ack.data) || ack.data.requestId > nextRequestId.current ||
          ack.data.requestId <= lastAck.current) return
        if (ack.data.status === 'applied') lastAck.current = ack.data.requestId
      }
      channel.port1.start()
      iframe.current?.contentWindow?.postMessage({ type: 'ombelle-preview-init', version: 1 }, '*', [channel.port2])
      void sendCurrent(channel.port1)
    }
    window.addEventListener('message', onReady)
    return () => {
      window.removeEventListener('message', onReady)
      sendEpoch.current++
      port.current?.close()
      port.current = null
    }
  }, [component])

  useEffect(() => {
    if (port.current) void sendCurrent(port.current)
  }, [result, view])

  const url = previewFrameUrl('editor', process.env.NEXT_PUBLIC_OMBELLE_PREVIEW_ORIGIN)
  return <iframe ref={iframe} title={`${componentName} recipe preview`}
    src={component ? `${url}?component=${encodeURIComponent(component)}` : url} sandbox="allow-scripts" />
}
