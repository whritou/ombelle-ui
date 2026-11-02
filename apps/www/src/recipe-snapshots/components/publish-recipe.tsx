'use client'
import { useEffect, useRef, useState } from 'react'
import type { RecipeCompileResult } from '@ombelle/contracts'
type ResolvedRecipe = RecipeCompileResult['recipe']
import type { PublishAttempt } from '../publication'
import { useRecipePublication } from '../use-publication'

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
    <fieldset>
      <legend>
        {retry ? 'Retry captured publication' : 'Confirm public publication'}
      </legend>
      <p>
        This publishes the captured recipe “{attempt.recipe.id}”, including
        its identity, text, props and style overrides. Anyone with the reference can read
        it. Do not include private information.
      </p>
      <p>
        Published data has no automatic expiry while the service operates. There
        is no anonymous edit or delete action. An operator may withdraw access;
        cached copies and installed source cannot be recalled.
      </p>
      <p>
        Captured recipe hash: <code>{attempt.recipeHash}</code>
      </p>
      <p>
        Retry the same captured content within 24 hours of the original attempt.
      </p>
      <label className="recipe-publication-consent">
        <input
          ref={checkbox}
          type="checkbox"
          disabled={pending}
          checked={accepted}
          onChange={(event) => setAccepted(event.target.checked)}
        />
        I understand this recipe will be public and retained as described above.
      </label>
      <div className="recipe-input-row">
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

export function PublishRecipe({
  recipe,
  current,
  announce,
}: {
  recipe: ResolvedRecipe | null
  current: boolean
  announce: (text: string) => void
}) {
  const publication = useRecipePublication({ recipe, current, announce })
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
    recipe !== null &&
    state.lastPublished?.recipeHash === recipe.hash
  return (
    <section aria-labelledby="recipe-publication-heading">
      <h3 id="recipe-publication-heading">Publish an immutable snapshot</h3>
      <p>
        Publication is optional. Local downloads and copies remain available if
        the publication service is unavailable. Published recipes remain drafts;
        schema and compilation checks do not imply an accessibility or quality review.
      </p>
      <p>
        {matches
          ? 'The current recipe matches the last published hash.'
          : 'Current edits are unpublished.'}
      </p>
      {state.lastPublished && (
        <p>
          Last published snapshot:{' '}
          <a
            href={`/recipes/${state.lastPublished.id}/${state.lastPublished.revision}`}
          >
            {state.lastPublished.id}@{state.lastPublished.revision}
          </a>
          <br />
          Published recipe hash: <code>{state.lastPublished.recipeHash}</code>
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
          enabled={current && recipe?.hash === state.attempt.recipeHash}
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
        disabled={!current || !recipe || captured}
        onClick={publication.confirm}
      >
        Publish recipe…
      </button>
      {pending && <p>Publishing the captured recipe…</p>}
    </section>
  )
}
