'use client'

import { useEffect, useRef, useState } from 'react'
import type { RecipeCompileResult } from '@ombelle/contracts'
import type { CompileDiagnostic, CompileRequest, CompileResponse } from './compile-protocol'

export type CompilerState = {
  status: 'idle' | 'compiling' | 'compiled' | 'invalid'
  result: RecipeCompileResult | null
  diagnostic: CompileDiagnostic | null
  stale: boolean
}

const initialState: CompilerState = {
  status: 'idle',
  result: null,
  diagnostic: null,
  stale: false,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isCompileResponse(input: unknown): input is CompileResponse {
  if (!isRecord(input) || !Number.isSafeInteger(input.requestId) || (input.requestId as number) < 0)
    return false
  if (input.type === 'invalid') {
    const diagnostic = input.diagnostic
    return isRecord(diagnostic) && typeof diagnostic.code === 'string' &&
      typeof diagnostic.message === 'string' &&
      (diagnostic.path === undefined || typeof diagnostic.path === 'string') &&
      (diagnostic.nextAction === undefined || typeof diagnostic.nextAction === 'string')
  }
  if (input.type !== 'compiled' || !isRecord(input.result)) return false
  const result = input.result
  return Array.isArray(result.artifacts) && result.artifacts.every((artifact: unknown) =>
    isRecord(artifact) && typeof artifact.logicalPath === 'string' &&
    ['component', 'style', 'usage', 'utility'].includes(artifact.kind as string) &&
    typeof artifact.content === 'string' && typeof artifact.sha256 === 'string'
  ) && Array.isArray(result.dependencies) &&
    result.dependencies.every((dependency: unknown) =>
      isRecord(dependency) && typeof dependency.name === 'string' && typeof dependency.version === 'string'
    ) && isRecord(result.recipe) && isRecord(result.recipe.data) &&
    typeof result.recipe.hash === 'string' && isRecord(result.preset) &&
    typeof result.scope === 'string' && typeof result.darkSelector === 'string' &&
    isRecord(result.provenance) &&
    typeof result.provenance.catalogRelease === 'string' &&
    typeof result.provenance.compilerVersion === 'string'
}

export function acceptCompileResponse(
  previous: CompilerState,
  input: unknown,
  latestRequestId: number,
): CompilerState {
  if (!isCompileResponse(input) || input.requestId !== latestRequestId) return previous
  if (input.type === 'compiled') {
    return { status: 'compiled', result: input.result, diagnostic: null, stale: false }
  }
  return {
    status: 'invalid',
    result: previous.result,
    diagnostic: input.diagnostic,
    stale: previous.result !== null,
  }
}

export function useCompiler(recipe: unknown): CompilerState {
  const [state, setState] = useState<CompilerState>(initialState)
  const worker = useRef<Worker | null>(null)
  const latestRequestId = useRef(0)

  useEffect(() => {
    const instance = new Worker('/editor-compiler.worker.js', { type: 'module' })
    worker.current = instance
    instance.onmessage = (event: MessageEvent<unknown>) => {
      setState((previous) => acceptCompileResponse(previous, event.data, latestRequestId.current))
    }
    instance.onerror = () => {
      setState((previous) => ({
        status: 'invalid',
        result: previous.result,
        diagnostic: { code: 'WORKER_FAILED', message: 'The compiler worker failed to load or run.' },
        stale: previous.result !== null,
      }))
    }
    return () => {
      instance.terminate()
      worker.current = null
    }
  }, [])

  useEffect(() => {
    const requestId = ++latestRequestId.current
    setState((previous) => ({
      ...previous,
      status: 'compiling',
      diagnostic: null,
      stale: previous.result !== null,
    }))
    const timer = window.setTimeout(() => {
      const request: CompileRequest = { type: 'compile', requestId, recipe }
      worker.current?.postMessage(request)
    }, 100)
    return () => window.clearTimeout(timer)
  }, [recipe])

  return state
}
