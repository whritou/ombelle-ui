import type { GlassContrastReport } from '@ombelle/compiler'

// Verbatim from docs/superpowers/specs/2026-11-03-liquid-glass-design.md.
export const glassLimitations = [
  'no mid-range mobile scrolling measurement',
  'no human visual, keyboard or screen-reader review',
  'the contrast guarantee covers the declared text pairs, not consumer content placed on glass',
  'browsers outside the recorded run were not tested',
  'form controls are unavailable',
  'the hosted snapshot service must be redeployed before glass codes resolve publicly',
] as const
export const glassReadoutId = 'glass-contrast-readout'
export const glassPairsId = 'glass-contrast-pairs'
// Truncated like the compiler's contrast error, so a shown 4.49 never rounds up.
const ratio = (value: number) => (Math.floor(value * 100) / 100).toFixed(2)

/** One-line summary: the live region announces only this, not every pair. */
export function glassReadoutSummary(report: GlassContrastReport | null): string {
  if (report === null)
    return 'Contrast bound not evaluated. Fix the draft errors to check it.'
  if (report.passes)
    return `Contrast bound passes at glass opacity ${report.opacity}: every declared text pair reaches 4.5:1 over black and white backdrops.`
  const count = report.pairs.filter((pair) => !pair.passes).length
  const minimum =
    report.minimumOpacity === null
      ? 'No glass opacity passes; raise the contrast of the failing colors.'
      : `Minimum passing glass opacity: ${report.minimumOpacity}.`
  return `Contrast bound fails at glass opacity ${report.opacity}: ${count} ${count === 1 ? 'pair is' : 'pairs are'} below 4.5:1. ${minimum} Export and publication are disabled until every pair passes.`
}

export function GlassContrastReadout({
  report,
}: {
  report: GlassContrastReport | null
}) {
  const failing = report?.pairs.filter((pair) => !pair.passes) ?? []
  return (
    <>
      <p role="status" id={glassReadoutId}>
        {glassReadoutSummary(report)}
      </p>
      {failing.length > 0 && (
        <ul id={glassPairsId} aria-label="Failing contrast pairs">
          {failing.map((pair) => {
            const overBlack = pair.ratioOverBlack <= pair.ratioOverWhite
            return (
              <li key={pair.mode + pair.surface + pair.text}>
                {pair.mode}: {pair.text} on {pair.surface},{' '}
                {ratio(overBlack ? pair.ratioOverBlack : pair.ratioOverWhite)}
                :1 over a {overBlack ? 'black' : 'white'} backdrop
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}

/** Limitations and the live contrast bound, shown whenever glass is selected. */
export function GlassPanel({ report }: { report: GlassContrastReport | null }) {
  return (
    <>
      <section aria-labelledby="glass-limitations-heading">
        <h2 id="glass-limitations-heading">Liquid glass limitations</h2>
        <p>
          Liquid glass is experimental. Button, Badge, Card, Dialog, Tabs and
          Tooltip support it; the other components are unavailable.
        </p>
        <ul>
          {glassLimitations.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="glass-contrast-heading">
        <h2 id="glass-contrast-heading">Liquid glass contrast bound</h2>
        <GlassContrastReadout report={report} />
      </section>
    </>
  )
}
