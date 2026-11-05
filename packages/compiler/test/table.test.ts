import { expect, it } from 'vitest'
import { supportedStyleFamilies } from '@ombelle/contracts'
import { getCatalog } from '@ombelle/catalog'
import { compile, glassContrastPairs, glassContrastReport, glassTints } from '../src/index.js'
import { expectStandaloneArtifacts, forcedBlock, rulesIn, squash, type Context } from './new-component-artifacts.js'

it.each(supportedStyleFamilies)(
  'compiles a deterministic standalone Table in %s',
  async (family) => {
    const { css } = await expectStandaloneArtifacts(family, 'table', {
      importLine: "from '@/components/ui/table'",
      dependencies: ['clsx', 'react', 'tailwind-merge'],
    })
    const forced = forcedBlock(css)
    expect(forced).toContain(
      '[data-slot="table-row"][data-state="selected"]>[data-slot="table-cell"]{background:Highlight;color:HighlightText;forced-color-adjust:none',
    )
    expect(forced).toContain('CanvasText')
  },
)

it('compiles Table in liquid glass: one glass container, a muted glass header and a tinted selected row', async () => {
  const preset = getCatalog('0.1.0').presets['liquid-glass']
  const result = await compile({ preset, componentIds: ['table'], catalogRelease: '0.1.0', compilerVersion: '0.1.0' })
  const css = result.artifacts.find((a) => a.logicalPath === 'components/ui/table.css')!.content
  const at = (selector: string, context: Context = 'root') => rulesIn(css, selector, context)
  const container = '[data-slot="table-container"]'
  const head = '[data-slot="table-head"]'
  const cell = '[data-slot="table-cell"]'
  const selected = '[data-state="selected"]>[data-slot="table-cell"]'
  const magnitude = 'max(var(--shadow-x),calc(var(--shadow-x)*-1),var(--shadow-y),calc(var(--shadow-y)*-1))'
  // One glass container: the shared edge, the radius and the kit's 0 12px 32px -12px drop shadow at the built-in offset.
  expect(at(container)).toMatchObject({
    border: 'var(--border-width)solidvar(--border)',
    'border-radius': 'calc(var(--radius)+4px)',
    background: 'var(--card)',
  })
  expect(at(container)['box-shadow']).toContain(
    'var(--shadow-x)var(--shadow-y)calc(' + magnitude + '*2.667)calc(' + magnitude + '*-1)rgb(000/0.35)',
  )
  expect(at(container, 'supports').background).toContain(
    'color-mix(insrgb,var(--card)calc(var(--glass-inner-opacity,var(--glass-opacity))*100%),transparent)',
  )
  expect(at(container, 'supports')['backdrop-filter']).toContain('var(--glass-inner-filter')
  // Everything inside is nested glass: no own blur, the nested coverage.
  expect(at(container + '*')).toMatchObject({
    '--glass-inner-filter': 'none',
    '--glass-inner-opacity': 'var(--glass-nested-opacity)',
  })
  // Body text is foreground on the card glass.
  expect(at('[data-slot="table"]').color).toBe('var(--foreground)')
  // The header is muted glass with mutedForeground labels and an edge hairline; rows are edge hairlines.
  expect(at(head)).toMatchObject({
    background: 'var(--muted)',
    color: 'var(--muted-foreground)',
    'border-block-end': 'var(--border-width)solidvar(--border)',
    'font-size': '0.75rem',
    'font-weight': '600',
  })
  expect(at(head, 'supports').background).toBe(
    'color-mix(insrgb,var(--muted)calc(var(--glass-inner-opacity,var(--glass-opacity))*100%),transparent)',
  )
  expect(at(cell)['border-block-start']).toBe('var(--border-width)solidvar(--border)')
  // The selected row mixes 12% primary into the card before the glass coverage and keeps foreground text.
  expect(at(selected)).toMatchObject({
    '--glass-tint': 'var(--primary)',
    '--glass-tint-amount': '12%',
    background: 'color-mix(insrgb,var(--glass-tint)var(--glass-tint-amount),var(--card))',
  })
  expect(at(selected).color).toBeUndefined()
  expect(at(selected, 'supports').background).toBe(
    'color-mix(insrgb,color-mix(insrgb,var(--glass-tint)var(--glass-tint-amount),var(--card))calc(var(--glass-inner-opacity,var(--glass-opacity))*100%),transparent)',
  )
  expect(squash(css)).not.toMatch(/--(primary|accent)-foreground|var\(--accent\)/)
  // Numeric cells keep tabular digits.
  expect(at(cell + '[data-numeric]')['font-variant-numeric']).toBe('tabular-nums')
  // Reduced transparency paints opaque surfaces without blur.
  expect(at(container, 'reduced')).toMatchObject({ background: 'var(--card)', 'backdrop-filter': 'none' })
  expect(at(head, 'reduced').background).toBe('var(--muted)')
  expect(at(selected, 'reduced').background).toBe('color-mix(insrgb,var(--glass-tint)var(--glass-tint-amount),var(--card))')
  // Forced colours: system colours, and the selected row is also bold, so it never depends on colour alone.
  expect(at(container, 'forced')).toMatchObject({ background: 'Canvas', 'border-color': 'CanvasText', 'box-shadow': 'none' })
  expect(at(selected, 'forced')).toMatchObject({
    background: 'Highlight',
    color: 'HighlightText',
    'forced-color-adjust': 'none',
    'font-weight': '600',
  })
  // Pairs: header labels are mutedForeground on muted, body text foreground on card, the selected row foreground on
  // the card tinted with primary 12%. Inside the container all three are nested glass at the nested coverage.
  expect(glassTints.selection).toEqual({ light: 0.12, dark: 0.12 })
  const selectedPair = { surface: 'card', text: 'foreground', tint: { color: 'primary', light: 0.12, dark: 0.12 } }
  for (const spec of [{ surface: 'muted', text: 'mutedForeground' }, { surface: 'card', text: 'foreground' }, selectedPair])
    expect(glassContrastPairs).toContainEqual(spec)
  const report = glassContrastReport(preset)
  const declared = report.pairs.filter(
    (p) =>
      p.coverage === undefined &&
      ((p.surface === 'muted' && p.text === 'mutedForeground' && !p.tint) ||
        (p.surface === 'card' && p.text === 'foreground' && (!p.tint || (p.tint.color === 'primary' && p.tint.amount === 0.12)))),
  )
  expect(declared).toHaveLength(6)
  for (const pair of declared) expect(pair.passes, JSON.stringify(pair)).toBe(true)
  expect(report.nestedOpacity).toEqual({ light: 0.69, dark: 0.92 })
})
