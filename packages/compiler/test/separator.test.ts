import { expect, it } from 'vitest'
import { supportedStyleFamilies } from '@ombelle/contracts'
import { getCatalog } from '@ombelle/catalog'
import { compile, glassContrastPairs, glassContrastReport } from '../src/index.js'
import { expectStandaloneArtifacts, forcedBlock, squash } from './new-component-artifacts.js'

it.each(supportedStyleFamilies)(
  'compiles a deterministic standalone Separator in %s',
  async (family) => {
    const { css } = await expectStandaloneArtifacts(family, 'separator', {
      importLine: "from '@/components/ui/separator'",
      dependencies: ['@radix-ui/react-separator', 'clsx', 'react', 'tailwind-merge'],
    })
    const forced = forcedBlock(css)
    expect(forced).toContain('border-block-start-color:CanvasText')
    expect(forced).toContain('[data-slot="separator"][data-orientation="vertical"]{border-inline-start-color:CanvasText')
  },
)

it('compiles Separator in liquid glass: an etched hairline and a label with no surface', async () => {
  const result = await compile({
    preset: getCatalog('0.1.0').presets['liquid-glass'],
    componentIds: ['separator'],
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
  })
  const css = result.artifacts.find((a) => a.logicalPath === 'components/ui/separator.css')!.content
  const flat = squash(css)
  const block = (selector: string) => flat.split(selector + '{')[1]?.split('}')[0] ?? ''
  const rule = '[data-slot="separator"]'
  const highlight = 'var(--glass-highlight,color-mix(insrgb,white35%,transparent))'
  // The edge line plus the rim highlight 1px beside it, in logical properties for both orientations.
  expect(block(rule + '[data-orientation="horizontal"]')).toContain('border-block-start:var(--border-width)solidvar(--border)')
  expect(block(rule + '[data-orientation="horizontal"]')).toContain('border-block-end:1pxsolid' + highlight)
  expect(block(rule + '[data-orientation="vertical"]')).toContain('border-inline-start:var(--border-width)solidvar(--border)')
  expect(block(rule + '[data-orientation="vertical"]')).toContain('border-inline-end:1pxsolid' + highlight)
  const labelled = rule + '[data-labelled][data-orientation="horizontal"]'
  expect(block(labelled)).toContain('color:var(--muted-foreground)')
  expect(block(labelled + '::before,' + labelled + '::after')).toContain('border-block-start:var(--border-width)solidvar(--border)')
  expect(block(labelled + '::before,' + labelled + '::after')).toContain('border-block-end:1pxsolid' + highlight)
  // As in the kit, the label paints no surface of its own: it is bounded by the glass it sits on.
  expect(flat).not.toContain('[data-slot="separator-label"]')
  expect(flat).not.toMatch(/background|backdrop-filter/)
  expect(flat).not.toMatch(/(?:^|[;{])(?:left|right|top|bottom|width|height):/)
  // Forced colours: system-colour lines and text; the highlight is dropped.
  const forced = forcedBlock(css)
  expect(forced).toContain('border-block-start-color:CanvasText')
  expect(forced).toContain('border-inline-start-color:CanvasText')
  expect(forced).toContain('color:CanvasText')
  // Inside a Card or other glass panel, mutedForeground on card glass bounds the label; it is declared and passes.
  expect(glassContrastPairs).toContainEqual({ surface: 'card', text: 'mutedForeground' })
  const report = glassContrastReport(getCatalog('0.1.0').presets['liquid-glass'])
  const label = report.pairs.filter((p) => p.surface === 'card' && p.text === 'mutedForeground' && !p.tint && p.coverage === undefined)
  expect(label).toHaveLength(2)
  for (const pair of label) expect(pair.passes, JSON.stringify(pair)).toBe(true)
})
