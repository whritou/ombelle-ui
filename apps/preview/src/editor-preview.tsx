import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { acceptPreviewRender, isPreviewInit, type PreviewRender } from '../../www/src/editor/preview-protocol'
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
    function initialize(event: MessageEvent<unknown>) {
      if (event.source !== window.parent || event.origin !== parentOrigin || !isPreviewInit(event.data) ||
        port || event.ports.length !== 1) return
      port = event.ports[0]
      port.onmessage = (update: MessageEvent<unknown>) => {
        const accepted = acceptPreviewRender(update.data, lastRequestId.current)
        if (!accepted) return
        lastRequestId.current = accepted.requestId
        setMessage(accepted)
      }
      port.start()
    }
    window.addEventListener('message', initialize)
    window.parent.postMessage({ type: 'ombelle-preview-ready', version: 1 }, '*')
    return () => {
      window.removeEventListener('message', initialize)
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
