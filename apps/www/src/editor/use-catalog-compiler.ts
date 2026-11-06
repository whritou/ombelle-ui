'use client'

import { useEffect, useRef, useState } from 'react'
import type { ComponentRecipe, ComponentRecipeCompileResult } from '@ombelle/contracts'
import { verifyCatalogCompileResult } from './catalog-preview-protocol'

type State = { result: ComponentRecipeCompileResult | null; error: string | null; pending: boolean }

export function useCatalogCompiler(recipe: ComponentRecipe): State {
  const [state, setState] = useState<State>({ result: null, error: null, pending: true })
  const worker = useRef<Worker | null>(null)
  const revision = useRef(0)
  const component = recipe.component

  useEffect(() => {
    const instance = new Worker('/editor-compiler.worker.js', { type: 'module' })
    worker.current = instance
    instance.onmessage = async ({ data }) => {
      if (!data || data.requestId !== revision.current) return
      if (data.type === 'invalid-catalog' && typeof data.error === 'string') {
        setState(previous => ({ ...previous, pending: false, error: data.error }))
      } else if (data.type === 'compiled-catalog' && data.component === component) {
        const result = await verifyCatalogCompileResult(data.result, component)
        if (result && worker.current === instance && data.requestId === revision.current)
          setState({ result, pending: false, error: null })
      }
    }
    instance.onerror = () => setState(previous => ({ ...previous, pending: false, error: 'The compiler worker failed.' }))
    return () => {
      instance.terminate()
      worker.current = null
    }
  }, [component])

  useEffect(() => {
    const requestId = ++revision.current
    setState(previous => ({ ...previous, pending: true, error: null }))
    const timer = window.setTimeout(() => worker.current?.postMessage({ type: 'compile-catalog', requestId, recipe }), 100)
    return () => window.clearTimeout(timer)
  }, [recipe])
  return state
}
