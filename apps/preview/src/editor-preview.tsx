import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { isPreviewInit, verifyPreviewRender, type PreviewRender } from '../../www/src/editor/preview-protocol'
import { editorButtons } from './generated/editor-buttons'
import './editor-preview.css'

type ButtonModule = Awaited<ReturnType<(typeof editorButtons)[keyof typeof editorButtons]>>

function EditorPreview() {
  const [message, setMessage] = React.useState<PreviewRender | null>(null)
  const [buttonModule, setButtonModule] = React.useState<{ family: string; module: ButtonModule } | null>(null)
  const lastRequestId = React.useRef(0)

  React.useEffect(() => {
    const parentOrigin = document.referrer ? new URL(document.referrer).origin : null
    let port: MessagePort | null = null
    const announce = () => {
      if (!port) window.parent.postMessage({ type: 'ombelle-preview-ready', version: 1 }, '*')
    }
    const retry = window.setInterval(announce, 150)
    function initialize(event: MessageEvent<unknown>) {
      if (event.source !== window.parent || event.origin !== parentOrigin || !isPreviewInit(event.data) ||
        event.ports.length !== 1) return
      port?.close()
      const attachedPort = event.ports[0]
      port = attachedPort
      window.clearInterval(retry)
      attachedPort.onmessage = async (update: MessageEvent<unknown>) => {
        const data = update.data
        const id = typeof data === 'object' && data !== null && 'requestId' in data &&
          typeof data.requestId === 'number' && Number.isSafeInteger(data.requestId) && data.requestId > 0
            ? data.requestId : null
        const accepted = await verifyPreviewRender(data, lastRequestId.current)
        if (attachedPort !== port) return
        if (!accepted || accepted.requestId <= lastRequestId.current) {
          if (id !== null) attachedPort.postMessage({ type: 'render-ack', requestId: id, status: 'rejected' })
          return
        }
        lastRequestId.current = accepted.requestId
        setMessage(accepted)
        attachedPort.postMessage({ type: 'render-ack', requestId: accepted.requestId, status: 'applied' })
      }
      attachedPort.start()
    }
    window.addEventListener('message', initialize)
    announce()
    return () => {
      window.removeEventListener('message', initialize)
      window.clearInterval(retry)
      port?.close()
    }
  }, [])

  const family = message?.state.recipe.presetRef.id.replace(/^builtin-/, '') as keyof typeof editorButtons | undefined
  React.useEffect(() => {
    if (!family || !(family in editorButtons)) return
    let active = true
    editorButtons[family]().then((loaded) => { if (active) setButtonModule({ family, module: loaded }) })
    return () => { active = false }
  }, [family])

  const state = message?.state
  const Button = buttonModule && buttonModule.family === family ? buttonModule.module.Button : null
  return <div className={state?.mode === 'dark' ? 'editor-preview dark' : 'editor-preview'} data-viewport={state?.viewport ?? 'wide'}>
    <style>{state?.css ?? ''}</style>
    {state && Button && <Button
      data-slot="recipe-button"
      data-ombelle-recipe={message.scope}
      variant={state.recipe.props.variant}
      size={state.recipe.props.size}
      type={state.recipe.props.type}
      disabled={state.recipe.props.disabled || state.recipe.props.loading}
      aria-busy={state.recipe.props.loading || undefined}
      data-forced-state={state.forcedState}
      className={state.forcedState === 'focus' ? 'editor-force-focus' : state.forcedState === 'hover' ? 'editor-force-hover' : undefined}
    >{state.recipe.content}</Button>}
  </div>
}

export function mountEditorPreview(element: HTMLElement) {
  createRoot(element).render(<EditorPreview />)
}
