import {
  validatePreset,
  type Preset,
  type PresetSnapshot,
  type ResolvedPreset,
} from '@ombelle/contracts'
import { canonicalize } from '@ombelle/compiler'

export const publicationMaxBytes = 128 * 1024
export const publicationMaxAge = 24 * 60 * 60 * 1000
export type PublishAttempt = {
  storageVersion: 1
  key: string
  createdAt: number
  preset: Preset
  presetHash: string
}
type PublicationBase = {
  lastPublished: PresetSnapshot | null
  draftHash: string | null
  operationId: number
}
export type PublicationState = PublicationBase &
  (
    | { status: 'idle'; attempt: null; error: null }
    | {
        status: 'validating' | 'publishing'
        attempt: PublishAttempt
        error: null
      }
    | { status: 'published'; attempt: null; error: null }
    | { status: 'failed'; attempt: PublishAttempt | null; error: string }
  )
export type PublicationAction =
  | { type: 'draft'; draftHash: string | null }
  | { type: 'confirm'; attempt: PublishAttempt; operationId: number }
  | { type: 'restore'; attempt: PublishAttempt }
  | { type: 'cancel' }
  | { type: 'publishing'; operationId: number; draftHash: string }
  | {
      type: 'published'
      operationId: number
      draftHash: string
      snapshot: PresetSnapshot
    }
  | { type: 'failed'; operationId: number; draftHash: string; error: string }

export function initialPublication(): PublicationState {
  return {
    status: 'idle',
    attempt: null,
    lastPublished: null,
    draftHash: null,
    operationId: 0,
    error: null,
  }
}
export function createPublishAttempt(
  preset: ResolvedPreset,
  now: number,
): PublishAttempt {
  const data = validatePreset(preset.data)
  if (
    !Number.isSafeInteger(now) ||
    now < 0 ||
    !/^[a-f0-9]{64}$/.test(preset.hash) ||
    new TextEncoder().encode(canonicalize(data)).byteLength > 65_536
  )
    throw new Error('The current preset cannot be published.')
  return {
    storageVersion: 1,
    key: crypto.randomUUID(),
    createdAt: now,
    preset: structuredClone(data),
    presetHash: preset.hash,
  }
}
export function reducePublication(
  state: PublicationState,
  action: PublicationAction,
): PublicationState {
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
      draftHash: action.attempt.presetHash,
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
    if (state.draftHash !== action.attempt.presetHash) return state
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
    state.attempt.presetHash !== action.draftHash
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
  if (action.type === 'published') {
    if (action.snapshot.presetHash !== action.draftHash) return state
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
