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
// Truncated like the compiler's contrast error, so a shown 4.49 never rounds up.
const ratio = (value: number) => (Math.floor(value * 100) / 100).toFixed(2)

export function GlassContrastReadout({
  report,
}: {
  report: GlassContrastReport | null
}) {
  const failing = report?.pairs.filter((pair) => !pair.passes) ?? []
  return (
    <div role="status" id={glassReadoutId}>
      {report === null ? (
        <p>Contrast bound not evaluated. Fix the draft errors to check it.</p>
      ) : report.passes ? (
        <p>
          Contrast bound passes at glass opacity {report.opacity}: every
          declared text pair reaches 4.5:1 over black and white backdrops.
        </p>
      ) : (
        <>
          <p>
            Contrast bound fails at glass opacity {report.opacity}. Export and
            publication are disabled until every pair passes.
          </p>
          <ul>
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
          <p>
            {report.minimumOpacity === null
              ? 'No glass opacity passes; raise the contrast of the failing colors.'
              : `Minimum passing glass opacity: ${report.minimumOpacity}.`}
          </p>
        </>
      )}
    </div>
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
