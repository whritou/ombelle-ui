'use client'

import { useEffect, useRef, useState } from 'react'
import type { ComponentRecipe, ComponentRecipeCompileResult } from '@ombelle/contracts'
import { verifyCatalogCompileResult } from './catalog-preview-protocol'
import { acquireWorker, nextRequestId } from './shared-worker'

type State = { result: ComponentRecipeCompileResult | null; error: string | null; pending: boolean }

export function useCatalogCompiler(recipe: ComponentRecipe): State {
  const [state, setState] = useState<State>({ result: null, error: null, pending: true })
  const worker = useRef<Worker | null>(null)
  const revision = useRef(0)
  const component = recipe.component

  useEffect(() => {
    const { worker: instance, release } = acquireWorker('/editor-compiler.worker.js')
    worker.current = instance
    const onMessage = async ({ data }: MessageEvent) => {
      if (!data || data.requestId !== revision.current) return
      if (data.type === 'invalid-catalog' && typeof data.error === 'string') {
        setState(previous => ({ ...previous, pending: false, error: data.error }))
      } else if (data.type === 'compiled-catalog' && data.component === component) {
        const result = await verifyCatalogCompileResult(data.result, component)
        if (result && worker.current === instance && data.requestId === revision.current)
          setState({ result, pending: false, error: null })
      }
    }
    const onError = () => setState(previous => ({ ...previous, pending: false, error: 'The compiler worker failed.' }))
    instance.addEventListener('message', onMessage)
    instance.addEventListener('error', onError)
    return () => {
      instance.removeEventListener('message', onMessage)
      instance.removeEventListener('error', onError)
      release()
      worker.current = null
    }
  }, [component])

  useEffect(() => {
    const requestId = (revision.current = nextRequestId())
    setState(previous => ({ ...previous, pending: true, error: null }))
    const timer = window.setTimeout(() => worker.current?.postMessage({ type: 'compile-catalog', requestId, recipe }), 100)
    return () => window.clearTimeout(timer)
  }, [recipe])
  return state
}
