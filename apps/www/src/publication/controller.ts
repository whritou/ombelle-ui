'use client'
import { useEffect, useRef, useState } from 'react'
import { canonicalize } from '@ombelle/compiler'
import { publicationFailure } from '../snapshots/publication-failure'
import {
  attemptData,
  attemptHash,
  createPublishAttempt,
  initialPublication,
  reducePublication,
  type PublicationAction,
  type PublicationState,
} from './attempt'
import {
  capitalized,
  fieldOf,
  publicationMaxAge,
  publicationMaxBytes,
  type PublicationKind,
  type PublicationTypes,
} from './kind'
import { readPublishAttempt, writePublishAttempt } from './storage'

export type PublicationOptions<T extends PublicationTypes> = {
  fetch?: typeof fetch
  storage?: () => Storage
  /** Overrides the kind's session-storage key, for editors that keep their own. */
  storageKey?: string
  now?: () => number
  notify?: (state: PublicationState<T>) => void
  announce?: (text: string) => void
  isCurrent?: (hash: string) => boolean
  verify?: (input: unknown) => Promise<T['snapshot']>
}

class WithdrawnPublicationError extends Error {}

async function readResponse(response: Response): Promise<unknown> {
  if (response.status !== 200 && response.status !== 201) {
    const failure = await publicationFailure(response)
    throw failure.withdrawn
      ? new WithdrawnPublicationError(failure.message)
      : new Error(failure.message)
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
export function createPublicationController<T extends PublicationTypes>(
  kind: PublicationKind<T>,
  options: PublicationOptions<T> = {},
) {
  let state = initialPublication<T>(),
    draft: T['resolved'] | null = null,
    disposed = false,
    draftSeen = false
  let active: AbortController | null = null
  const now = options.now ?? Date.now
  const send = options.fetch ?? globalThis.fetch
  const storageKey = options.storageKey ?? kind.storageKey
  const dispatch = (action: PublicationAction<T>) => {
    if (disposed) return
    state = reducePublication(kind, state, action)
    options.notify?.(state)
  }
  const save = () => {
    try {
      if (!options.storage) return
      if (state.attempt && state.status !== 'withdrawn')
        writePublishAttempt(kind, options.storage(), state.attempt, storageKey)
      else options.storage().removeItem(storageKey)
    } catch {
      /* Memory retries remain available if storage is denied. */
    }
  }
  try {
    const attempt =
      options.storage &&
      readPublishAttempt(kind, options.storage(), now(), storageKey)
    if (attempt)
      state = reducePublication(kind, state, { type: 'restore', attempt })
  } catch {
    /* Storage denial must not prevent local exports or memory retries. */
  }

  async function submit(retry: boolean) {
    if (
      disposed ||
      !draft ||
      active ||
      (retry ? state.status !== 'failed' : state.status !== 'validating') ||
      !state.attempt ||
      attemptHash(kind, state.attempt) !== draft.hash ||
      options.isCurrent?.(draft.hash) === false
    )
      return
    const attempt = state.attempt,
      operationId = state.operationId,
      draftHash = draft.hash
    const captured = attemptData(kind, attempt),
      capturedHash = attemptHash(kind, attempt)
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
      const normalized = await kind.normalize(captured)
      if (!current()) return
      if (
        normalized.hash !== capturedHash ||
        canonicalize(normalized.data) !== canonicalize(captured)
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
        const response = await send(kind.endpoint, {
          method: 'POST',
          redirect: 'error',
          signal: abort.signal,
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': attempt.key,
          },
          body: canonicalize({ [kind.field]: captured }),
        })
        if (!current()) {
          void response.body?.cancel().catch(() => {})
          return null
        }
        const input = await readResponse(response)
        if (!current()) return null
        const snapshot = await (options.verify ?? kind.verify)(input)
        // Verification hashes asynchronously too: fence after it, not just fetch.
        if (!current()) return null
        if (
          attemptHash(kind, snapshot) !== capturedHash ||
          canonicalize(fieldOf(snapshot, kind.field)) !== canonicalize(captured)
        )
          throw new Error(
            `The returned snapshot does not match the captured ${kind.noun}. Retry the same attempt.`,
          )
        return snapshot
      })()
      const snapshot = await Promise.race([request, timeout])
      if (!current() || !snapshot) return
      dispatch({ type: 'published', operationId, draftHash, snapshot })
      save()
      if (current())
        options.announce?.(
          `${capitalized(kind.noun)} published. The public snapshot is attached to its published hash.`,
        )
    } catch (error) {
      // A timeout aborts transport but is still an error for the same intent.
      if (!ownsOperation()) return
      if (error instanceof WithdrawnPublicationError) {
        dispatch({
          type: 'withdrawn',
          operationId,
          draftHash,
          error: error.message,
        })
        // Terminal attempts must never restore as retryable after a refresh.
        // A later publication requires a newly confirmed intent and key.
        save()
        return
      }
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
    update(next: T['resolved'] | null, current: boolean) {
      if (disposed) return
      draft = current ? next : null
      // Let initial compiler/draft hydration finish before evaluating a restored
      // attempt. No effects publish it and retry stays disabled until current.
      if (!draftSeen && !draft) return
      draftSeen = true
      const hash = draft?.hash ?? null
      if (hash === state.draftHash) return
      active?.abort()
      active = null
      dispatch({ type: 'draft', draftHash: hash })
      save()
    },
    confirm() {
      if (
        disposed ||
        !draft ||
        active ||
        options.isCurrent?.(draft.hash) === false
      )
        return
      dispatch({
        type: 'confirm',
        operationId: state.operationId + 1,
        attempt: createPublishAttempt(kind, draft, now()),
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

/** The editor hook over one controller: `usePublication` and `useRecipePublication` wrap it. */
export function usePublicationController<T extends PublicationTypes>(
  kind: PublicationKind<T>,
  input: {
    draft: T['resolved'] | null
    current: boolean
    announce: (text: string) => void
    storageKey?: string
  },
) {
  const [state, setState] = useState<PublicationState<T>>(initialPublication)
  const controller = useRef<ReturnType<
    typeof createPublicationController<T>
  > | null>(null)
  const latest = useRef(input)
  latest.current = input
  const hash = input.current ? (input.draft?.hash ?? null) : null
  useEffect(() => {
    const handle = createPublicationController(kind, {
      storage: () => window.sessionStorage,
      storageKey: input.storageKey,
      notify: setState,
      announce: (text) => latest.current.announce(text),
      isCurrent: (expected) =>
        latest.current.current && latest.current.draft?.hash === expected,
    })
    controller.current = handle
    handle.update(latest.current.draft, latest.current.current)
    setState(handle.state)
    return () => {
      handle.dispose()
      controller.current = null
    }
    // The kind is a module constant; a new storage key needs a new controller.
  }, [input.storageKey])
  useEffect(() => {
    controller.current?.update(input.draft, input.current)
  }, [hash, input.draft, input.current])
  const visible =
    state.status === 'published' &&
    (state.lastPublished ? attemptHash(kind, state.lastPublished) : undefined) !==
      hash
      ? reducePublication(kind, state, { type: 'draft', draftHash: hash })
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
    /**
     * Opening "Get code" is the publication intent: capture the current draft
     * and publish it in one step, or retry a failed capture of the same draft.
     */
    generate: async () => {
      const handle = controller.current
      if (!handle) return
      const { status, attempt } = handle.state
      if (status === 'publishing') return
      if (status === 'withdrawn') handle.cancel()
      if (status === 'failed' && attempt) return handle.retry()
      if (status !== 'validating') handle.confirm()
      await handle.publish()
    },
  }
}
