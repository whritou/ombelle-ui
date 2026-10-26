'use client'

import { useEffect, useRef } from 'react'
import type { RecipeCompileResult } from '@ombelle/contracts'
import type { EditorView } from '../model'
import { isPreviewReady, validatePreviewCompileResult, type PreviewRender } from '../preview-protocol'

const previewUrl = 'http://127.0.0.1:4173/editor-preview/'

export function PreviewFrame({ result, view }: { result: RecipeCompileResult | null; view: EditorView }) {
  const iframe = useRef<HTMLIFrameElement>(null)
  const port = useRef<MessagePort | null>(null)
  const latest = useRef({ result, view })
  const nextRequestId = useRef(0)
  latest.current = { result, view }

  useEffect(() => {
    function render() {
      const current = latest.current
      const compiled = validatePreviewCompileResult(current.result)
      if (!port.current || !compiled) return
      const css = compiled.artifacts.find((artifact) => artifact.kind === 'style')?.content
      if (!css) return
      const requestId = ++nextRequestId.current
      const message: PreviewRender = {
        type: 'render', requestId, scope: compiled.scope,
        state: { recipe: compiled.recipe.data, css, mode: current.view.mode,
          viewport: current.view.viewport, forcedState: current.view.forcedState, requestId },
      }
      port.current.postMessage(message)
    }
    function onReady(event: MessageEvent<unknown>) {
      if (event.source !== iframe.current?.contentWindow || event.origin !== 'null' ||
        !isPreviewReady(event.data) || port.current) return
      const channel = new MessageChannel()
      port.current = channel.port1
      iframe.current?.contentWindow?.postMessage({ type: 'ombelle-preview-init', version: 1 }, '*', [channel.port2])
      render()
    }
    window.addEventListener('message', onReady)
    return () => {
      window.removeEventListener('message', onReady)
      port.current?.close()
      port.current = null
    }
  }, [])

  useEffect(() => {
    const compiled = validatePreviewCompileResult(result)
    const css = compiled?.artifacts.find((artifact) => artifact.kind === 'style')?.content
    if (!port.current || !compiled || !css) return
    const requestId = ++nextRequestId.current
    port.current.postMessage({
      type: 'render', requestId, scope: compiled.scope,
      state: { recipe: compiled.recipe.data, css, mode: view.mode, viewport: view.viewport,
        forcedState: view.forcedState, requestId },
    } satisfies PreviewRender)
  }, [result, view])

  return <iframe ref={iframe} title="Button recipe preview" src={previewUrl} sandbox="allow-scripts" />
}
