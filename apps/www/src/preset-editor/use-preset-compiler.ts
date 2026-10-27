'use client'
import { useEffect, useRef, useState } from 'react'
import { canonicalize } from '@ombelle/compiler'
import type { CompileResult } from '@ombelle/contracts'
import type { PresetEditorDraft } from './model.js'
import type { PresetCompileRequest, PresetCompileResponse, PresetDiagnostic } from './compile-protocol.js'

export type PresetCompilerState = { status: 'idle' | 'compiling' | 'compiled' | 'invalid'; result: CompileResult | null; draftKey: string | null; diagnostic: PresetDiagnostic | null; stale: boolean }
const initial = (): PresetCompilerState => ({ status: 'idle', result: null, draftKey: null, diagnostic: null, stale: false })
function record(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value) }
function response(input: unknown): input is PresetCompileResponse {
  if (!record(input) || !Number.isSafeInteger(input.requestId)) return false
  if (input.type === 'preset-invalid') return record(input.diagnostic) && typeof input.diagnostic.code === 'string' && typeof input.diagnostic.message === 'string'
  if (input.type !== 'preset-compiled' || !record(input.result)) return false
  const r = input.result
  return record(r.preset) && record(r.preset.data) && typeof r.preset.hash === 'string' && /^[a-f0-9]{64}$/.test(r.preset.hash) &&
    Array.isArray(r.artifacts) && r.artifacts.length > 0 && r.artifacts.every((a) => record(a) && typeof a.logicalPath === 'string' && typeof a.content === 'string' && typeof a.sha256 === 'string' && /^[a-f0-9]{64}$/.test(a.sha256)) &&
    Array.isArray(r.dependencies) && r.dependencies.every((d) => record(d) && typeof d.name === 'string' && typeof d.version === 'string') && record(r.theme) && record(r.theme.light) && record(r.theme.dark) && record(r.theme.theme) && record(r.provenance) && r.provenance.catalogRelease === '0.1.0' && r.provenance.compilerVersion === '0.1.0'
}
export function createPresetCompiler(send: (request: PresetCompileRequest) => void, notify: (state: PresetCompilerState) => void) {
  let state = initial(), serial = 0, activeId = 0, activeKey: string | null = null, pendingKey: string | null = null
  let timer: ReturnType<typeof setTimeout> | undefined
  const emit = (next: PresetCompilerState) => { state = next; notify(next) }
  return {
    get state() { return state },
    update(draft: PresetEditorDraft) {
      clearTimeout(timer)
      pendingKey = canonicalize(draft)
      activeId = ++serial
      activeKey = pendingKey
      emit({ ...state, status: 'compiling', diagnostic: null, stale: state.result !== null })
      const id = activeId
      timer = setTimeout(() => send({ type: 'compile-preset', requestId: id, draft }), 150)
    },
    receive(input: unknown) {
      if (!response(input) || input.requestId !== activeId || activeKey !== pendingKey) return
      if (input.type === 'preset-compiled') emit({ status: 'compiled', result: input.result, draftKey: activeKey, diagnostic: null, stale: false })
      else emit({ ...state, status: 'invalid', draftKey: activeKey, diagnostic: input.diagnostic, stale: state.result !== null })
    },
    fail() { clearTimeout(timer); activeId = ++serial; emit({ ...state, status: 'invalid', diagnostic: { code: 'WORKER_FAILED', message: 'The compiler stopped. Retry compilation.', nextAction: 'Retry compilation.' }, stale: state.result !== null }) },
    dispose() { clearTimeout(timer); activeId = ++serial; pendingKey = null },
  }
}
export function usePresetCompiler(draft: PresetEditorDraft) {
  const [state, setState] = useState<PresetCompilerState>(initial)
  const [attempt, setAttempt] = useState(0)
  const controller = useRef<ReturnType<typeof createPresetCompiler> | null>(null)
  const latest = useRef(draft)
  latest.current = draft
  const key = canonicalize(draft)
  const latestKey = useRef(key)
  latestKey.current = key
  useEffect(() => {
    let worker: Worker | null = null
    const handle = createPresetCompiler((request) => { try { worker?.postMessage(request) } catch { handle.fail() } }, setState)
    controller.current = handle
    try {
      worker = new Worker('/preset-compiler.worker.js', { type: 'module' })
      worker.onmessage = (event: MessageEvent<unknown>) => handle.receive(event.data)
      worker.onerror = () => handle.fail()
      worker.onmessageerror = () => handle.fail()
      handle.update(latest.current)
    } catch { handle.fail() }
    return () => { handle.dispose(); worker?.terminate(); controller.current = null }
  }, [attempt])
  useEffect(() => { controller.current?.update(draft) }, [key, attempt])
  // Gate during render as well as effects: an old worker response must not make
  // an edited draft exportable in the interval before the next effect runs.
  const current = state.draftKey === key ? state : { ...state, stale: state.result !== null, status: state.status === 'invalid' && state.diagnostic?.code === 'WORKER_FAILED' ? 'invalid' as const : 'compiling' as const }
  return { ...current, retry: () => setAttempt((value) => value + 1) }
}
