'use client'
import { useEffect, useRef, useState } from 'react'
import {
  canonicalize,
  normalizePublishedPreset,
  verifyPresetSnapshot,
} from '@ombelle/compiler'
import type { ResolvedPreset } from '@ombelle/contracts'
import {
  createPublishAttempt,
  initialPublication,
  publicationMaxAge,
  publicationMaxBytes,
  reducePublication,
  type PublicationAction,
  type PublicationState,
} from './publication'
import {
  publicationStorageKey,
  readPublishAttempt,
  writePublishAttempt,
} from './publication-storage'

type PublicationOptions = {
  fetch?: typeof fetch
  storage?: () => Storage
  now?: () => number
  notify?: (state: PublicationState) => void
  announce?: (text: string) => void
  isCurrent?: (hash: string) => boolean
  verify?: typeof verifyPresetSnapshot
}

async function readResponse(response: Response): Promise<unknown> {
  if (response.status !== 200 && response.status !== 201) {
    void response.body?.cancel().catch(() => {})
    if (response.status === 429)
      throw new Error(
        'Publication limit reached. Wait before retrying the same attempt.',
      )
    if (response.status === 410)
      throw new Error('This publication was withdrawn. It cannot be retried.')
    throw new Error(
      'Publication is unavailable. Your local exports still work; retry this attempt within 24 hours.',
    )
  }
  if (
    !/^application\/json(?:\s*;|$)/i.test(
      response.headers.get('Content-Type') ?? '',
    ) ||
    !response.body
  ) {
    void response.body?.cancel().catch(() => {})
    throw new Error('The publication service returned an invalid response.')
  }
  const reader = response.body.getReader(),
    chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > publicationMaxBytes)
        throw new Error('The publication response exceeded the size limit.')
      chunks.push(value)
    }
  } catch (error) {
    void reader.cancel().catch(() => {})
    throw error
  } finally {
    reader.releaseLock()
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
}

// This controller owns the hook's actual transport and lifecycle, following the
// compiler hook pattern. Recovery is inert; only publish/retry may send a POST.
export function createPublicationController(options: PublicationOptions = {}) {
  let state = initialPublication(),
    preset: ResolvedPreset | null = null,
    disposed = false,
    draftSeen = false
  let active: AbortController | null = null
  const now = options.now ?? Date.now
  const send = options.fetch ?? globalThis.fetch
  const dispatch = (action: PublicationAction) => {
    if (disposed) return
    state = reducePublication(state, action)
    options.notify?.(state)
  }
  const save = () => {
    try {
      if (!options.storage) return
      if (state.attempt) writePublishAttempt(options.storage(), state.attempt)
      else options.storage().removeItem(publicationStorageKey)
    } catch {
      /* Memory retries remain available if storage is denied. */
    }
  }
  try {
    const attempt =
      options.storage && readPublishAttempt(options.storage(), now())
    if (attempt) state = reducePublication(state, { type: 'restore', attempt })
  } catch {
    /* Storage denial must not prevent local exports or memory retries. */
  }

  async function submit(retry: boolean) {
    if (
      disposed ||
      !preset ||
      active ||
      (retry ? state.status !== 'failed' : state.status !== 'validating') ||
      !state.attempt ||
      state.attempt.presetHash !== preset.hash ||
      options.isCurrent?.(preset.hash) === false
    )
      return
    const attempt = state.attempt,
      operationId = state.operationId,
      draftHash = preset.hash
    const abort = new AbortController()
    active = abort
    const ownsOperation = () =>
      !disposed &&
      active === abort &&
      state.operationId === operationId &&
      state.draftHash === draftHash &&
      options.isCurrent?.(draftHash) !== false
    const current = () => !abort.signal.aborted && ownsOperation()
    dispatch({ type: 'publishing', operationId, draftHash })
    save()
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      if (
        now() < attempt.createdAt ||
        now() - attempt.createdAt >= publicationMaxAge
      )
        throw new Error(
          'The 24-hour retry window expired. Cancel and confirm a new publication.',
        )
      const normalized = await normalizePublishedPreset(attempt.preset)
      if (!current()) return
      if (
        normalized.hash !== attempt.presetHash ||
        canonicalize(normalized.data) !== canonicalize(attempt.preset)
      )
        throw new Error(
          'The captured publication could not be verified. Cancel and confirm the current draft again.',
        )
      const timeout = new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          reject(
            new Error(
              'Publication timed out. Retry the same attempt within 24 hours.',
            ),
          )
          abort.abort()
        }, 10_000)
      })
      const request = (async () => {
        const response = await send('/api/v1/presets', {
          method: 'POST',
          redirect: 'error',
          signal: abort.signal,
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': attempt.key,
          },
          body: canonicalize({ preset: attempt.preset }),
        })
        if (!current()) {
          void response.body?.cancel().catch(() => {})
          return null
        }
        const input = await readResponse(response)
        if (!current()) return null
        const snapshot = await (options.verify ?? verifyPresetSnapshot)(input)
        // Verification hashes asynchronously too: fence after it, not just fetch.
        if (!current()) return null
        if (
          snapshot.presetHash !== attempt.presetHash ||
          canonicalize(snapshot.preset) !== canonicalize(attempt.preset)
        )
          throw new Error(
            'The returned snapshot does not match the captured preset. Retry the same attempt.',
          )
        return snapshot
      })()
      const snapshot = await Promise.race([request, timeout])
      if (!current() || !snapshot) return
      dispatch({ type: 'published', operationId, draftHash, snapshot })
      save()
      if (current())
        options.announce?.(
          'Preset published. The public snapshot is attached to its published hash.',
        )
    } catch (error) {
      // A timeout aborts transport but is still an error for the same intent.
      if (!ownsOperation()) return
      const message =
        error instanceof Error &&
        !['SyntaxError', 'TypeError', 'FoundationError', 'AbortError'].includes(
          error.name,
        )
          ? error.message
          : 'Publication could not be verified or reached. Your local exports still work; retry the same attempt within 24 hours.'
      dispatch({ type: 'failed', operationId, draftHash, error: message })
      if (ownsOperation()) options.announce?.(message)
    } finally {
      clearTimeout(timer)
      if (active === abort) active = null
    }
  }
  return {
    get state() {
      return state
    },
    update(next: ResolvedPreset | null, current: boolean) {
      if (disposed) return
      preset = current ? next : null
      // Let initial compiler/draft hydration finish before evaluating a restored
      // attempt. No effects publish it and retry stays disabled until current.
      if (!draftSeen && !preset) return
      draftSeen = true
      const hash = preset?.hash ?? null
      if (hash === state.draftHash) return
      active?.abort()
      active = null
      dispatch({ type: 'draft', draftHash: hash })
      save()
    },
    confirm() {
      if (
        disposed ||
        !preset ||
        active ||
        options.isCurrent?.(preset.hash) === false
      )
        return
      dispatch({
        type: 'confirm',
        operationId: state.operationId + 1,
        attempt: createPublishAttempt(preset, now()),
      })
    },
    cancel() {
      active?.abort()
      active = null
      dispatch({ type: 'cancel' })
      save()
    },
    publish: () => submit(false),
    retry: () => submit(true),
    dispose() {
      disposed = true
      active?.abort()
      active = null
    },
  }
}

export function usePublication(input: {
  preset: ResolvedPreset | null
  current: boolean
  announce: (text: string) => void
}) {
  const [state, setState] = useState<PublicationState>(initialPublication)
  const controller = useRef<ReturnType<
    typeof createPublicationController
  > | null>(null)
  const latest = useRef(input)
  latest.current = input
  const hash = input.current ? (input.preset?.hash ?? null) : null
  useEffect(() => {
    const handle = createPublicationController({
      storage: () => window.sessionStorage,
      notify: setState,
      announce: (text) => latest.current.announce(text),
      isCurrent: (expected) =>
        latest.current.current && latest.current.preset?.hash === expected,
    })
    controller.current = handle
    handle.update(latest.current.preset, latest.current.current)
    setState(handle.state)
    return () => {
      handle.dispose()
      controller.current = null
    }
  }, [])
  useEffect(() => {
    controller.current?.update(input.preset, input.current)
  }, [hash, input.preset, input.current])
  const visible =
    state.status === 'published' && state.lastPublished?.presetHash !== hash
      ? reducePublication(state, { type: 'draft', draftHash: hash })
      : state
  return {
    state: visible,
    confirm: () => controller.current?.confirm(),
    cancel: () => controller.current?.cancel(),
    publish: async () => {
      await controller.current?.publish()
    },
    retry: async () => {
      await controller.current?.retry()
    },
  }
}
