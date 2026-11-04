'use client'
import { useState } from 'react'
import type { GlassContrastReport } from '@ombelle/compiler'
import type { PresetEditablePath } from '../model'
import type { TokenContrast } from '../contrast'
import { glassReadoutSummary } from './glass-panel'
import styles from './preset-checks.module.css'

const words = (key: string) =>
  key.replace(/[A-Z]/g, (c) => ' ' + c.toLowerCase())
const sentence = (key: string) => {
  const text = words(key)
  return text[0]!.toUpperCase() + text.slice(1)
}
const ratioText = (pair: TokenContrast) =>
  pair.ratio === null ? 'Not evaluated' : `${pair.ratio.toFixed(2)}:1`

/** Contrast warnings, plus one when the liquid-glass bound fails. */
export function presetWarningCount(
  contrast: readonly TokenContrast[],
  glassReport: GlassContrastReport | null,
): number {
  const warnings = contrast.filter((pair) => pair.status === 'warning').length
  return warnings + (glassReport !== null && !glassReport.passes ? 1 : 0)
}

export function PresetChecks({
  contrast,
  glassReport,
  onEditToken,
}: {
  contrast: readonly TokenContrast[]
  glassReport: GlassContrastReport | null
  onEditToken(path: PresetEditablePath): void
}) {
  const [showPassing, setShowPassing] = useState(false)
  if (!contrast.length)
    return <p className={styles.empty}>Contrast checks are pending.</p>
  const warnings = contrast.filter((pair) => pair.status === 'warning')
  const passing = contrast.filter((pair) => pair.status !== 'warning')
  const glassFails = glassReport !== null && !glassReport.passes
  return (
    <div className={styles.checks}>
      <ul className={styles.summary} aria-label="Contrast results by mode">
        {(['light', 'dark'] as const).map((mode) => {
          const pairs = contrast.filter((pair) => pair.mode === mode)
          const passes = pairs.filter((pair) => pair.status === 'pass').length
          return (
            <li key={mode} data-ok={passes === pairs.length || undefined}>
              <span>{sentence(mode)}</span>
              <strong>
                {passes} / {pairs.length} pass
              </strong>
            </li>
          )
        })}
      </ul>
      {(warnings.length > 0 || glassFails) && (
        <ul className={styles.cards} aria-label="Warnings">
          {glassFails && (
            <li className={styles.card} data-status="warning">
              <strong>Liquid glass contrast bound</strong>
              <span>{glassReadoutSummary(glassReport)}</span>
            </li>
          )}
          {warnings.map((pair) => (
            <li
              key={pair.mode + pair.foreground}
              className={styles.card}
              data-status="warning"
            >
              <strong>
                {sentence(pair.foreground)} on {words(pair.background)}
              </strong>
              <span>
                {sentence(pair.mode)} · {ratioText(pair)}
              </span>
              <button
                type="button"
                onClick={() =>
                  onEditToken(
                    `/modes/${pair.mode}/${pair.foreground}` as PresetEditablePath,
                  )
                }
              >
                Edit {words(pair.foreground)} token
              </button>
            </li>
          ))}
        </ul>
      )}
      {passing.length > 0 && (
        <section aria-label="Passing pairs">
          <div className={styles.passingHead}>
            <h3>
              {warnings.length ? 'Other pairs' : 'Passing pairs'} (
              {passing.length})
            </h3>
            <button
              type="button"
              aria-expanded={showPassing}
              aria-controls="preset-checks-passing"
              onClick={() => setShowPassing((open) => !open)}
            >
              {showPassing ? 'Hide' : 'Show'}
            </button>
          </div>
          {showPassing && (
            <ul id="preset-checks-passing" className={styles.passing}>
              {passing.map((pair) => (
                <li
                  key={pair.mode + pair.foreground}
                  data-status={pair.status}
                >
                  {sentence(pair.mode)} {words(pair.foreground)}/
                  {words(pair.background)}: {ratioText(pair)}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <p className={styles.caveat}>
        Eight text pairs in both modes, using a 4.5:1 threshold. Warnings do not
        prevent export. This does not evaluate every component state or non-text
        contrast.
      </p>
    </div>
  )
}
