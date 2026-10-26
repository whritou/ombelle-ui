'use client'

import { useEffect, useRef } from 'react'
import type { RecipeCompileResult } from '@ombelle/contracts'
import type { EditorView } from '../model'
import { isPreviewAck, isPreviewReady, verifyPreviewCompileResult, type PreviewRender } from '../preview-protocol'

const previewUrl = 'http://127.0.0.1:4173/editor-preview/'

export function PreviewFrame({ result, view }: { result: RecipeCompileResult | null; view: EditorView }) {
  const iframe = useRef<HTMLIFrameElement>(null)
  const port = useRef<MessagePort | null>(null)
  const latest = useRef({ result, view })
  const nextRequestId = useRef(0)
  const sendEpoch = useRef(0)
  const lastAck = useRef(0)
  latest.current = { result, view }

  async function sendCurrent(targetPort: MessagePort) {
    const epoch = ++sendEpoch.current
    const current = latest.current
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
  }, [])

  useEffect(() => {
    if (port.current) void sendCurrent(port.current)
  }, [result, view])

  return <iframe ref={iframe} title="Button recipe preview" src={previewUrl} sandbox="allow-scripts" />
}
