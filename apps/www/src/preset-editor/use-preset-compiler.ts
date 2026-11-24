'use client'
import { useEffect, useRef, useState } from 'react'
import { canonicalize } from '@ombelle/compiler/light'
import {
  validatePreset,
  isStyleFamily,
  type CompileResult,
} from '@ombelle/contracts'
import type { PresetEditorDraft } from './model'
import { acquireWorker, nextRequestId } from '../editor/shared-worker'
import type {
  PresetCompileRequest,
  PresetCompileResponse,
  PresetDiagnostic,
} from './compile-protocol'

export type PresetCompilerState = {
  status: 'idle' | 'compiling' | 'compiled' | 'invalid'
  result: CompileResult | null
  draftKey: string | null
  diagnostic: PresetDiagnostic | null
  stale: boolean
}
const initial = (): PresetCompilerState => ({
  status: 'idle',
  result: null,
  draftKey: null,
  diagnostic: null,
  stale: false,
})
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function response(input: unknown): input is PresetCompileResponse {
  if (!record(input) || !Number.isSafeInteger(input.requestId)) return false
  if (input.type === 'preset-invalid')
    return (
      record(input.diagnostic) &&
      typeof input.diagnostic.code === 'string' &&
      typeof input.diagnostic.message === 'string' &&
      (input.diagnostic.path === undefined ||
        typeof input.diagnostic.path === 'string') &&
      (input.diagnostic.nextAction === undefined ||
        typeof input.diagnostic.nextAction === 'string')
    )
  if (input.type !== 'preset-compiled' || !record(input.result)) return false
  const r = input.result
  if (!record(r.preset)) return false
  try {
    const preset = validatePreset(r.preset.data)
    if (
      !isStyleFamily(preset.styleFamily) ||
      preset.catalogRelease !== '0.1.0' ||
      preset.compilerVersion !== '0.1.0'
    )
      return false
  } catch {
    return false
  }
  return (
    record(r.preset) &&
    record(r.preset.data) &&
    typeof r.preset.hash === 'string' &&
    /^[a-f0-9]{64}$/.test(r.preset.hash) &&
    Array.isArray(r.artifacts) &&
    r.artifacts.length > 0 &&
    r.artifacts.every(
      (a) =>
        record(a) &&
        typeof a.logicalPath === 'string' &&
        typeof a.content === 'string' &&
        ['component', 'style', 'usage', 'utility'].includes(a.kind as string) &&
        typeof a.sha256 === 'string' &&
        /^[a-f0-9]{64}$/.test(a.sha256),
    ) &&
    Array.isArray(r.dependencies) &&
    r.dependencies.every(
      (d) =>
        record(d) &&
        typeof d.name === 'string' &&
        typeof d.version === 'string',
    ) &&
    record(r.theme) &&
    record(r.theme.light) &&
    record(r.theme.dark) &&
    record(r.theme.theme) &&
    record(r.provenance) &&
    r.provenance.catalogRelease === '0.1.0' &&
    r.provenance.compilerVersion === '0.1.0'
  )
}
export function createPresetCompiler(
  send: (request: PresetCompileRequest) => void,
  notify: (state: PresetCompilerState) => void,
) {
  let state = initial(),
    activeId = 0,
    activeKey: string | null = null,
    pendingKey: string | null = null
  let timer: ReturnType<typeof setTimeout> | undefined
  // At most one request in flight. The worker compiles requests one after another and never skips a
  // superseded one, so a post per edit queues every stale draft behind the latest: on a slow machine
  // the latest result came back about 26 s after the edit. While a request is out, only the latest
  // draft waits; it is sent when the reply arrives.
  let inFlight: { requestId: number; key: string } | null = null,
    queued: PresetCompileRequest | null = null
  const dispatch = (request: PresetCompileRequest) => {
    if (inFlight) {
      queued = request
      return
    }
    inFlight = { requestId: request.requestId, key: canonicalize(request.draft) }
    send(request)
  }
  const emit = (next: PresetCompilerState) => {
    state = next
    notify(next)
  }
  return {
    get state() {
      return state
    },
    update(draft: PresetEditorDraft) {
      clearTimeout(timer)
      pendingKey = canonicalize(draft)
      activeId = nextRequestId()
      activeKey = pendingKey
      emit({
        ...state,
        status: 'compiling',
        diagnostic: null,
        stale: state.result !== null,
      })
      const id = activeId
      timer = setTimeout(
        () => dispatch({ type: 'compile-preset', requestId: id, draft }),
        150,
      )
    },
    receive(input: unknown) {
      if (inFlight && record(input) && input.requestId === inFlight.requestId) {
        const settled = inFlight.key
        inFlight = null
        const next = queued
        queued = null
        // A reply for the very draft now current answers it; anything else sends the latest draft.
        if (next && settled === pendingKey && response(input)) activeId = input.requestId
        else if (next) dispatch(next)
      }
      if (
        !response(input) ||
        input.requestId !== activeId ||
        activeKey !== pendingKey
      )
        return
      if (input.type === 'preset-compiled')
        emit({
          status: 'compiled',
          result: input.result,
          draftKey: activeKey,
          diagnostic: null,
          stale: false,
        })
      else
        emit({
          ...state,
          status: 'invalid',
          draftKey: activeKey,
          diagnostic: input.diagnostic,
          stale: state.result !== null,
        })
    },
    fail() {
      clearTimeout(timer)
      // The worker is gone or its reply is lost: free the slot, so the next edit or Retry sends at once.
      inFlight = null
      queued = null
      activeId = nextRequestId()
      emit({
        ...state,
        status: 'invalid',
        diagnostic: {
          code: 'WORKER_FAILED',
          message: 'The compiler stopped. Retry compilation.',
          nextAction: 'Retry compilation.',
        },
        stale: state.result !== null,
      })
    },
    dispose() {
      clearTimeout(timer)
      inFlight = null
      queued = null
      activeId = nextRequestId()
      pendingKey = null
    },
  }
}
export function usePresetCompiler(draft: PresetEditorDraft) {
  const [state, setState] = useState<PresetCompilerState>(initial)
  const [attempt, setAttempt] = useState(0)
  const controller = useRef<ReturnType<typeof createPresetCompiler> | null>(
    null,
  )
  const latest = useRef(draft)
  latest.current = draft
  const key = canonicalize(draft)
  useEffect(() => {
    let worker: Worker | null = null
    let release = () => {}
    const handle = createPresetCompiler((request) => {
      try {
        if (worker) worker.postMessage(request)
        else handle.fail()
      } catch {
        handle.fail()
      }
    }, setState)
    controller.current = handle
    const onMessage = (event: MessageEvent<unknown>) => handle.receive(event.data)
    const onFail = () => handle.fail()
    try {
      // Shared with the editor's other compiler (the catalog default Get code compares to).
      const shared = acquireWorker('/preset-compiler.worker.js')
      worker = shared.worker
      release = shared.release
      worker.addEventListener('message', onMessage)
      worker.addEventListener('error', onFail)
      worker.addEventListener('messageerror', onFail)
      handle.update(latest.current)
    } catch {
      handle.fail()
    }
    return () => {
      handle.dispose()
      worker?.removeEventListener('message', onMessage)
      worker?.removeEventListener('error', onFail)
      worker?.removeEventListener('messageerror', onFail)
      release()
      controller.current = null
    }
  }, [attempt])
  useEffect(() => {
    controller.current?.update(draft)
  }, [key, attempt])
  // Gate during render as well as effects: an old worker response must not make
  // an edited draft exportable in the interval before the next effect runs.
  const current =
    state.draftKey === key
      ? state
      : {
          ...state,
          stale: state.result !== null,
          status:
            state.status === 'invalid' &&
            state.diagnostic?.code === 'WORKER_FAILED'
              ? ('invalid' as const)
              : ('compiling' as const),
        }
  return { ...current, retry: () => setAttempt((value) => value + 1) }
}
