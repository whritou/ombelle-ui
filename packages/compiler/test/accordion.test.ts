import { expect, it } from 'vitest'
import { supportedStyleFamilies } from '@ombelle/contracts'
import { getCatalog } from '@ombelle/catalog'
import { compile, glassContrastPairs, glassContrastReport, glassTints } from '../src/index.js'
import {
  expectStandaloneArtifacts,
  forcedBlock,
  rulesIn,
  squash,
  type Context,
} from './new-component-artifacts.js'

const dependencies = ['@radix-ui/react-accordion', 'clsx', 'lucide-react', 'react', 'tailwind-merge']

it.each(supportedStyleFamilies)(
  'compiles a deterministic standalone Accordion in %s',
  async (family) => {
    const { css } = await expectStandaloneArtifacts(family, 'accordion', {
      importLine: "from '@/components/ui/accordion'",
      dependencies,
    })
    const forced = forcedBlock(css)
    expect(forced).toContain('[data-slot="accordion-trigger"]:focus-visible{outline-color:Highlight')
    expect(forced).toContain('[data-slot="accordion-trigger"]:disabled{')
    expect(forced).toContain('GrayText')
  },
)

it.each(supportedStyleFamilies)(
  '%s shows exactly one accordion icon, minimalist the plus',
  async (family) => {
    const { css } = await expectStandaloneArtifacts(family, 'accordion', {
      importLine: "from '@/components/ui/accordion'",
      dependencies,
    })
    const hidden = family === 'minimalist' ? 'chevron' : 'plus'
    expect(squash(css)).toContain(`[data-accordion-icon="${hidden}"]{display:none;}`)
  },
)

it('compiles Accordion in liquid glass: a glass container, an open trigger tinted primary 12% and a turning chevron', async () => {
  const preset = getCatalog('0.1.0').presets['liquid-glass']
  const result = await compile({ preset, componentIds: ['accordion'], catalogRelease: '0.1.0', compilerVersion: '0.1.0' })
  const css = result.artifacts.find((a) => a.logicalPath === 'components/ui/accordion.css')!.content
  const at = (selector: string, context: Context = 'root') => rulesIn(css, selector, context)
  const root = '[data-slot="accordion"]'
  const trigger = '[data-slot="accordion-trigger"]'
  const open = trigger + '[data-state="open"]'
  const content = '[data-slot="accordion-content"]'
  const magnitude = 'max(var(--shadow-x),calc(var(--shadow-x)*-1),var(--shadow-y),calc(var(--shadow-y)*-1))'
  // A glass container with the shared edge, radius and drop shadow; items are edge hairlines.
  expect(at(root)).toMatchObject({
    border: 'var(--border-width)solidvar(--border)',
    'border-radius': 'calc(var(--radius)+4px)',
    background: 'var(--card)',
    color: 'var(--foreground)',
  })
  expect(at(root)['box-shadow']).toContain(
    'var(--shadow-x)var(--shadow-y)calc(' + magnitude + '*2.667)calc(' + magnitude + '*-1)rgb(000/0.35)',
  )
  expect(at(root, 'supports').background).toBe(
    'color-mix(insrgb,var(--card)calc(var(--glass-inner-opacity,var(--glass-opacity))*100%),transparent)',
  )
  expect(at(root + '*')).toMatchObject({
    '--glass-inner-filter': 'none',
    '--glass-inner-opacity': 'var(--glass-nested-opacity)',
  })
  expect(at('*+[data-slot="accordion-item"]')['border-block-start']).toBe('var(--border-width)solidvar(--border)')
  // Trigger text is foreground at 600; the open trigger mixes 12% primary into the card, then the glass coverage.
  expect(at(trigger)).toMatchObject({ color: 'var(--foreground)', 'font-weight': '600' })
  expect(at(open)).toMatchObject({
    '--glass-tint': 'var(--primary)',
    '--glass-tint-amount': '12%',
    background: 'color-mix(insrgb,var(--glass-tint)var(--glass-tint-amount),var(--card))',
  })
  expect(at(open).color).toBeUndefined()
  expect(at(open, 'supports').background).toBe(
    'color-mix(insrgb,color-mix(insrgb,var(--glass-tint)var(--glass-tint-amount),var(--card))calc(var(--glass-inner-opacity,var(--glass-opacity))*100%),transparent)',
  )
  expect(at(open, 'reduced').background).toBe('color-mix(insrgb,var(--glass-tint)var(--glass-tint-amount),var(--card))')
  expect(at(root, 'reduced')).toMatchObject({ background: 'var(--card)', 'backdrop-filter': 'none' })
  expect(squash(css)).not.toMatch(/--(primary|accent)-foreground|var\(--accent\)/)
  // The chevron turns on the open trigger, through one data-slot; the plus icon is hidden.
  expect(at('[data-state="open"]>[data-slot="accordion-icon"][data-accordion-icon="chevron"]').rotate).toBe('180deg')
  expect(at('[data-accordion-icon="plus"]').display).toBe('none')
  // Content is mutedForeground on the card glass; its height animation runs only while open.
  expect(at(content).color).toBe('var(--muted-foreground)')
  expect(at(content).animation).toBeUndefined()
  expect(at(content + '[data-state="open"]').animation).toContain('ombelle-accordion-open')
  // Reduced motion removes the height animation and the chevron's rotation transition.
  expect(at(content + '[data-state="open"]', 'motion').animation).toBe('none')
  expect(at('[data-slot="accordion-icon"]svg', 'motion').transition).toBe('none')
  // Forced colours: system colours; the open trigger also carries a CanvasText bar, so it never depends on colour alone.
  expect(at(root, 'forced')).toMatchObject({ background: 'Canvas', color: 'CanvasText', 'border-color': 'CanvasText', 'box-shadow': 'none' })
  expect(at(open, 'forced')).toMatchObject({ background: 'Canvas', color: 'CanvasText', 'border-inline-start': '0.25remsolidCanvasText' })
  expect(at(trigger + ':focus-visible', 'forced')['outline-color']).toBe('Highlight')
  expect(at(trigger + ':disabled', 'forced').color).toBe('GrayText')
  // Pairs: trigger text is foreground on card, content mutedForeground on card, the open trigger foreground on the card
  // tinted with primary 12% (nested glass inside the container).
  const specs = [
    { surface: 'card', text: 'foreground' },
    { surface: 'card', text: 'mutedForeground' },
    { surface: 'card', text: 'foreground', tint: { color: 'primary', ...glassTints.selection } },
  ]
  for (const spec of specs) expect(glassContrastPairs).toContainEqual(spec)
  const report = glassContrastReport(preset)
  const declared = report.pairs.filter(
    (p) =>
      p.surface === 'card' &&
      p.coverage === undefined &&
      ((p.text === 'mutedForeground' && !p.tint) ||
        (p.text === 'foreground' && (!p.tint || (p.tint.color === 'primary' && p.tint.amount === 0.12)))),
  )
  expect(declared).toHaveLength(6)
  for (const pair of declared) expect(pair.passes, JSON.stringify(pair)).toBe(true)
})
