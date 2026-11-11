'use client'

import { useEffect, useRef, useState } from 'react'
import type { ComponentRecipe, InstallableRecipeCompileResult } from '@ombelle/contracts'
import { verifyCatalogCompileResult } from './catalog-preview-protocol'
import { verifyPreviewCompileResult } from './preview-protocol'
import type { BatchRequest } from './compile-protocol'

type State = { results: InstallableRecipeCompileResult[] | null; pending: boolean; error: string | null }

const idle: State = { results: null, pending: false, error: null }

/**
 * Compiles several recipes in one worker request: the matrix cells, or the catalog default
 * for the diff. Null recipes keep it idle. A response for anything but the latest request is
 * dropped, so a slow batch never replaces a newer one.
 */
export function useRecipeBatch(kind: BatchRequest['kind'], recipes: readonly unknown[] | null): State {
  const [state, setState] = useState<State>(idle)
  const worker = useRef<Worker | null>(null)
  const latest = useRef(0)

  useEffect(() => {
    const instance = new Worker('/editor-compiler.worker.js', { type: 'module' })
    worker.current = instance
    instance.onmessage = async ({ data }) => {
      if (!data || data.requestId !== latest.current) return
      if (data.type === 'invalid-batch') {
        setState({ results: null, pending: false, error: typeof data.message === 'string' ? data.message : 'The recipes could not be compiled.' })
        return
      }
      if (data.type !== 'compiled-batch' || !Array.isArray(data.results)) return
      const requestId = data.requestId
      const verified = await Promise.all((data.results as unknown[]).map((result) => {
        if (kind !== 'catalog') return verifyPreviewCompileResult(result)
        const component = (result as { recipe?: { data?: { component?: unknown } } } | null)?.recipe?.data?.component
        return typeof component === 'string' ? verifyCatalogCompileResult(result, component as ComponentRecipe['component']) : null
      }))
      if (worker.current !== instance || requestId !== latest.current) return
      if (verified.some((result) => !result)) setState({ results: null, pending: false, error: 'A compiled recipe did not verify.' })
      else setState({ results: verified as InstallableRecipeCompileResult[], pending: false, error: null })
    }
    instance.onerror = () => setState({ results: null, pending: false, error: 'The compiler worker failed.' })
    return () => {
      instance.terminate()
      worker.current = null
    }
  }, [kind])

  useEffect(() => {
    const requestId = ++latest.current
    if (!recipes) {
      setState(idle)
      return
    }
    setState((previous) => ({ ...previous, pending: true, error: null }))
    const request: BatchRequest = { type: 'compile-batch', requestId, kind, recipes: [...recipes] }
    const timer = window.setTimeout(() => worker.current?.postMessage(request), 150)
    return () => window.clearTimeout(timer)
  }, [kind, recipes])
  return state
}
