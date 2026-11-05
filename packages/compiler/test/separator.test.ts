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

it('compiles Separator in liquid glass: an etched hairline and a label on card glass', async () => {
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
  // The label paints the card glass its contrast pair is checked against, at full glass coverage.
  expect(block('[data-slot="separator-label"]')).toContain('background:var(--card)')
  expect(flat).toContain('@supports((backdrop-filter:blur(1px))or(-webkit-backdrop-filter:blur(1px)))')
  expect(flat).toContain('color-mix(insrgb,var(--card)calc(var(--glass-inner-opacity,var(--glass-opacity))*100%),transparent)')
  expect(flat).toContain('prefers-reduced-transparency')
  expect(flat).not.toMatch(/(?:^|[;{])(?:left|right|top|bottom|width|height):/)
  // Forced colours: system-colour lines and text; the highlight is dropped.
  const forced = forcedBlock(css)
  expect(forced).toContain('border-block-start-color:CanvasText')
  expect(forced).toContain('border-inline-start-color:CanvasText')
  expect(forced).toContain('color:CanvasText')
  expect(forced).toContain('[data-slot="separator-label"]{background:Canvas')
  // mutedForeground on card glass is declared and passes with the built-in preset.
  expect(glassContrastPairs).toContainEqual({ surface: 'card', text: 'mutedForeground' })
  const report = glassContrastReport(getCatalog('0.1.0').presets['liquid-glass'])
  const label = report.pairs.filter((p) => p.surface === 'card' && p.text === 'mutedForeground' && !p.tint && p.coverage === undefined)
  expect(label).toHaveLength(2)
  for (const pair of label) expect(pair.passes, JSON.stringify(pair)).toBe(true)
})
