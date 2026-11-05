import type { GlassContrastReport } from '@ombelle/compiler'
import { glassComponentList } from '../../site/components/catalog'

// From docs/superpowers/specs/2026-11-03-liquid-glass-design.md, updated when Input became experimental.
export const glassLimitations = [
  'no mid-range mobile scrolling measurement',
  'no human visual, keyboard or screen-reader review',
  'the contrast guarantee covers the declared text pairs, not consumer content placed on glass',
  'browsers outside the recorded run were not tested',
  'form controls other than Input are unavailable',
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
    return `Contrast bound passes at glass opacity ${report.opacity}: every declared text pair reaches 4.5:1 over any backdrop the glass filter can produce.${minimums(report)}`
  const count = report.pairs.filter((pair) => !pair.passes).length
  const minimum =
    report.minimumOpacity === null
      ? 'No glass opacity passes; raise the contrast of the failing colors.'
      : `Minimum passing glass opacity: ${report.minimumOpacity}.`
  return `Contrast bound fails at glass opacity ${report.opacity}: ${count} ${count === 1 ? 'pair is' : 'pairs are'} below 4.5:1. ${minimum} The preview shows your settings; Get code and export stay disabled until every pair passes.`
}
const minimums = ({ minimumOpacityByMode: m, transparency }: GlassContrastReport) =>
  transparency === 'reduced' || m.light === null || m.dark === null
    ? ''
    : ` Lowest passing opacity: ${m.light} light, ${m.dark} dark.`
const worst = (pair: GlassContrastReport['pairs'][number]) =>
  (
    [
      [pair.ratioOverBlack, 'over the darkest filtered backdrop'],
      [pair.ratioOverWhite, 'over the brightest filtered backdrop'],
      [pair.ratioOpaque, 'on the opaque fallback surface'],
    ] as const
  ).reduce((a, b) => (b[0] < a[0] ? b : a))

export function GlassContrastReadout({
  report,
}: {
  report: GlassContrastReport | null
}) {
  const failing = report?.pairs.filter((pair) => !pair.passes) ?? []
  return (
    <>
      <p
        role="status"
        id={glassReadoutId}
        data-status={report?.passes ? 'pass' : 'fail'}
      >
        {glassReadoutSummary(report)}
      </p>
      {failing.length > 0 && (
        <ul id={glassPairsId} aria-label="Failing contrast pairs">
          {failing.map((pair) => {
            const [value, where] = worst(pair)
            return (
              <li key={pair.mode + pair.surface + pair.text}>
                {pair.mode}: {pair.text} on {pair.surface}
                {pair.tint &&
                  ` + ${pair.tint.color} ${Math.round(pair.tint.amount * 100)}%`}
                , {ratio(value)}:1 {where}
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
          Liquid glass is experimental. {glassComponentList()} support it; the
          other components are unavailable.
        </p>
        <details>
          <summary>{glassLimitations.length} known limitations</summary>
          <ul>
            {glassLimitations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </details>
      </section>
      <section aria-labelledby="glass-contrast-heading">
        <h2 id="glass-contrast-heading">Liquid glass contrast bound</h2>
        <GlassContrastReadout report={report} />
      </section>
    </>
  )
}
