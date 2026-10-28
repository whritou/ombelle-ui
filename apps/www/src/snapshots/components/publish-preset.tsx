'use client'
import { useEffect, useRef, useState } from 'react'
import type { ResolvedPreset } from '@ombelle/contracts'
import type { PublishAttempt } from '../publication'
import { usePublication } from '../use-publication'

function PublicationConsent({
  attempt,
  pending,
  retry,
  canSubmit,
  enabled,
  focusConsent,
  onSubmit,
  onCancel,
}: {
  attempt: PublishAttempt
  pending: boolean
  retry: boolean
  canSubmit: boolean
  enabled: boolean
  focusConsent: boolean
  onSubmit: () => Promise<void>
  onCancel: () => void
}) {
  const [accepted, setAccepted] = useState(false)
  const checkbox = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (focusConsent) checkbox.current?.focus()
  }, [focusConsent])
  return (
    <fieldset disabled={pending}>
      <legend>
        {retry ? 'Retry captured publication' : 'Confirm public publication'}
      </legend>
      <p>
        This publishes the captured preset “{attempt.preset.name}”, including
        its name, identity and theme values. Anyone with the reference can read
        it. Do not include private information.
      </p>
      <p>
        Published data has no automatic expiry while the service operates. There
        is no anonymous edit or delete action. An operator may withdraw access;
        cached copies and installed source cannot be recalled.
      </p>
      <p>
        Captured preset hash: <code>{attempt.presetHash}</code>
      </p>
      <p>
        Retry the same captured content within 24 hours of the original attempt.
      </p>
      <label className="preset-publication-consent">
        <input
          ref={checkbox}
          type="checkbox"
          checked={accepted}
          onChange={(event) => setAccepted(event.target.checked)}
        />
        I understand this preset will be public and retained as described above.
      </label>
      <div className="preset-input-row">
        {canSubmit && (
          <button
            type="button"
            disabled={!enabled || !accepted || pending}
            onClick={() => {
              setAccepted(false)
              void onSubmit()
            }}
          >
            {pending
              ? 'Publishing…'
              : retry
                ? 'Retry publication'
                : 'Publish public snapshot'}
          </button>
        )}
        <button type="button" onClick={onCancel}>
          Cancel publication
        </button>
      </div>
    </fieldset>
  )
}

export function PublishPreset({
  preset,
  current,
  announce,
}: {
  preset: ResolvedPreset | null
  current: boolean
  announce: (text: string) => void
}) {
  const publication = usePublication({ preset, current, announce })
  const { state } = publication
  const openButton = useRef<HTMLButtonElement>(null)
  const returnFocus = useRef(false)
  const pending = state.status === 'publishing'
  const captured =
    state.status === 'validating' ||
    pending ||
    state.status === 'failed' ||
    state.status === 'withdrawn'
  useEffect(() => {
    if (!captured && returnFocus.current) {
      returnFocus.current = false
      openButton.current?.focus()
    }
  }, [captured])
  const matches =
    current &&
    preset !== null &&
    state.lastPublished?.presetHash === preset.hash
  return (
    <section aria-labelledby="preset-publication-heading">
      <h3 id="preset-publication-heading">Publish an immutable snapshot</h3>
      <p>
        Publication is optional. Local downloads and copies remain available if
        the publication service is unavailable. Published presets remain drafts;
        automated token contrast is the only validation performed.
      </p>
      <p>
        {matches
          ? 'The current preset matches the last published hash.'
          : 'Current edits are unpublished.'}
      </p>
      {state.lastPublished && (
        <p>
          Last published snapshot:{' '}
          <a
            href={`/presets/${state.lastPublished.id}/${state.lastPublished.revision}`}
          >
            {state.lastPublished.id}@{state.lastPublished.revision}
          </a>
          <br />
          Published preset hash: <code>{state.lastPublished.presetHash}</code>
        </p>
      )}
      {(state.status === 'failed' || state.status === 'withdrawn') && (
        <p role="alert">{state.error}</p>
      )}
      {captured && state.attempt ? (
        <PublicationConsent
          key={state.attempt.key}
          attempt={state.attempt}
          retry={state.status === 'failed'}
          canSubmit={state.status !== 'withdrawn'}
          pending={pending}
          focusConsent={state.status === 'validating'}
          enabled={current && preset?.hash === state.attempt.presetHash}
          onSubmit={
            state.status === 'failed' ? publication.retry : publication.publish
          }
          onCancel={() => {
            returnFocus.current = true
            publication.cancel()
          }}
        />
      ) : null}
      <button
        ref={openButton}
        type="button"
        disabled={!current || !preset || captured}
        onClick={publication.confirm}
      >
        Publish preset…
      </button>
      {pending && <p>Publishing the captured preset…</p>}
    </section>
  )
}
