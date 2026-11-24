import { canonicalize } from '@ombelle/compiler/light'
import {
  fieldOf,
  publicationContentMaxBytes,
  type PublicationKind,
  type PublicationTypes,
} from './kind'

export type PublishAttempt<T extends PublicationTypes> = {
  storageVersion: 1
  key: string
  createdAt: number
} & Record<T['field'], T['data']> &
  Record<T['hashField'], string>
type PublicationBase<T extends PublicationTypes> = {
  lastPublished: T['snapshot'] | null
  draftHash: string | null
  operationId: number
}
export type PublicationState<T extends PublicationTypes> = PublicationBase<T> &
  (
    | { status: 'idle'; attempt: null; error: null }
    | {
        status: 'validating' | 'publishing'
        attempt: PublishAttempt<T>
        error: null
      }
    | { status: 'published'; attempt: null; error: null }
    | { status: 'failed'; attempt: PublishAttempt<T> | null; error: string }
    | { status: 'withdrawn'; attempt: PublishAttempt<T>; error: string }
  )
export type PublicationAction<T extends PublicationTypes> =
  | { type: 'draft'; draftHash: string | null }
  | { type: 'confirm'; attempt: PublishAttempt<T>; operationId: number }
  | { type: 'restore'; attempt: PublishAttempt<T> }
  | { type: 'cancel' }
  | { type: 'publishing'; operationId: number; draftHash: string }
  | {
      type: 'published'
      operationId: number
      draftHash: string
      snapshot: T['snapshot']
    }
  | { type: 'failed'; operationId: number; draftHash: string; error: string }
  | { type: 'withdrawn'; operationId: number; draftHash: string; error: string }

export function initialPublication<
  T extends PublicationTypes,
>(): PublicationState<T> {
  return {
    status: 'idle',
    attempt: null,
    lastPublished: null,
    draftHash: null,
    operationId: 0,
    error: null,
  }
}

/** Builds an attempt record with the kind's field names. */
export function publishAttempt<T extends PublicationTypes>(
  kind: PublicationKind<T>,
  fields: { key: string; createdAt: number; data: T['data']; hash: string },
): PublishAttempt<T> {
  return {
    storageVersion: 1,
    key: fields.key,
    createdAt: fields.createdAt,
    [kind.field]: fields.data,
    [kind.hashField]: fields.hash,
  } as PublishAttempt<T>
}

export const attemptData = <T extends PublicationTypes>(
  kind: PublicationKind<T>,
  attempt: PublishAttempt<T>,
) => fieldOf(attempt, kind.field) as T['data']
export const attemptHash = <T extends PublicationTypes>(
  kind: PublicationKind<T>,
  value: PublishAttempt<T> | T['snapshot'],
) => fieldOf(value, kind.hashField) as string

export function createPublishAttempt<T extends PublicationTypes>(
  kind: PublicationKind<T>,
  draft: T['resolved'],
  now: number,
): PublishAttempt<T> {
  const data = kind.validate(draft.data)
  if (
    !Number.isSafeInteger(now) ||
    now < 0 ||
    !/^[a-f0-9]{64}$/.test(draft.hash) ||
    new TextEncoder().encode(canonicalize(data)).byteLength >
      publicationContentMaxBytes
  )
    throw new Error(`The current ${kind.noun} cannot be published.`)
  return publishAttempt(kind, {
    key: crypto.randomUUID(),
    createdAt: now,
    data: structuredClone(data),
    hash: draft.hash,
  })
}

export function reducePublication<T extends PublicationTypes>(
  kind: PublicationKind<T>,
  state: PublicationState<T>,
  action: PublicationAction<T>,
): PublicationState<T> {
  if (action.type === 'draft') {
    if (state.draftHash === action.draftHash) return state
    return {
      ...state,
      status: 'idle',
      draftHash: action.draftHash,
      operationId: state.operationId + 1,
      attempt: null,
      error: null,
    }
  }
  if (action.type === 'restore')
    return {
      ...state,
      status: 'failed',
      attempt: action.attempt,
      draftHash: attemptHash(kind, action.attempt),
      error:
        'A pending publication was recovered. Retry explicitly within 24 hours of the original attempt.',
    }
  if (action.type === 'cancel')
    return {
      ...state,
      status: 'idle',
      attempt: null,
      error: null,
      operationId: state.operationId + 1,
    }
  if (action.type === 'confirm') {
    if (state.draftHash !== attemptHash(kind, action.attempt)) return state
    return {
      ...state,
      status: 'validating',
      attempt: action.attempt,
      error: null,
      operationId: action.operationId,
    }
  }
  if (
    state.operationId !== action.operationId ||
    state.draftHash !== action.draftHash ||
    !state.attempt ||
    attemptHash(kind, state.attempt) !== action.draftHash
  )
    return state
  if (action.type === 'publishing')
    return {
      ...state,
      status: 'publishing',
      attempt: state.attempt,
      error: null,
    }
  if (state.status !== 'publishing') return state
  if (action.type === 'withdrawn')
    return {
      ...state,
      status: 'withdrawn',
      attempt: state.attempt,
      error: action.error,
    }
  if (action.type === 'published') {
    if (attemptHash(kind, action.snapshot) !== action.draftHash) return state
    return {
      ...state,
      status: 'published',
      attempt: null,
      error: null,
      lastPublished: action.snapshot,
    }
  }
  return {
    ...state,
    status: 'failed',
    attempt: state.attempt,
    error: action.error,
  }
}
