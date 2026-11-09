import { expect, it } from 'vitest'
import { supportedStyleFamilies } from '@ombelle/contracts'
import { getCatalog } from '@ombelle/catalog'
import { compile } from '../src/index.js'
import { expectStandaloneArtifacts, forcedBlock, rulesIn, squash, type Context } from './new-component-artifacts.js'

it.each(supportedStyleFamilies)(
  'compiles a deterministic standalone Progress in %s',
  async (family) => {
    const { css } = await expectStandaloneArtifacts(family, 'progress', {
      importLine: "from '@/components/ui/progress'",
      dependencies: ['@radix-ui/react-progress', 'clsx', 'react', 'tailwind-merge'],
    })
    const forced = forcedBlock(css)
    expect(forced).toMatch(/\[data-slot="progress"\]\{background:Canvas;border:1pxsolidCanvasText/)
    expect(forced).toContain('background:Highlight;forced-color-adjust:none')
    // The sweep follows the preset's motion setting, so reduced-motion presets hold still.
    expect(squash(css)).toContain('animation:ombelle-progress-sweepcalc(var(--motion-duration)*10)')
    expect(squash(css)).not.toMatch(/(?:^|[;{])(?:left|right|transform):/)
  },
)

it('compiles Progress in liquid glass: a glass track, a glossy solid primary fill with an inner sheen, a green complete state and a faded full indeterminate rest', async () => {
  const preset = getCatalog('0.1.0').presets['liquid-glass']
  const result = await compile({ preset, componentIds: ['progress'], catalogRelease: '0.1.0', compilerVersion: '0.1.0' })
  const css = result.artifacts.find((a) => a.logicalPath === 'components/ui/progress.css')!.content
  const at = (selector: string, context: Context = 'root') => rulesIn(css, selector, context)
  const track = '[data-slot="progress"]'
  const fill = '[data-slot="progress-indicator"]'
  expect(at(track)).toMatchObject({
    border: 'var(--border-width)solidvar(--border)',
    'border-radius': '999px',
    overflow: 'hidden',
  })
  expect(at(track).background).toBe('color-mix(insrgb,var(--foreground)10%,var(--card))')
  expect(at(track, 'supports').background).toBe(
    'color-mix(insrgb,color-mix(insrgb,var(--foreground)10%,var(--card))calc(var(--glass-inner-opacity,var(--glass-opacity))*100%),transparent)',
  )
  expect(at(track, 'supports')['backdrop-filter']).toContain('blur(var(--glass-blur))')
  expect(at(track, 'reduced')).toMatchObject({ background: 'color-mix(insrgb,var(--foreground)10%,var(--card))', 'backdrop-filter': 'none' })
  // The fill is solid primary with a white gloss and an inner sheen (the track clips any outer glow); no text sits on it.
  expect(at(fill).background).toBe(
    'linear-gradient(tobottom,rgb(255255255/35%),transparent60%),var(--primary)',
  )
  expect(at(fill)['box-shadow']).toBe('inset006px-1pxrgb(255255255/55%)')
  expect(at(fill + '[data-state="complete"]').background).toBe(
    'linear-gradient(tobottom,rgb(255255255/35%),transparent60%),#16a34a',
  )
  expect(at(fill + '[data-state="complete"]')['box-shadow']).toBe('inset006px-1pxrgb(255255255/55%)')
  // Indeterminate: a sweeping segment over the preset motion duration; at rest a faded full fill.
  expect(at(fill + '[data-state="indeterminate"]')).toMatchObject({
    'inline-size': '100%',
    opacity: '0.45',
    animation: 'ombelle-progress-sweepcalc(var(--motion-duration)*10)ease-in-outinfinite',
  })
  expect(at(fill + '[data-state="indeterminate"]', 'motion').animation).toBe('none')
  expect(at(fill, 'motion').transition).toBe('none')
  expect(squash(css)).not.toMatch(/(?:^|[;{])(?:left|right|transform):/)
  expect(squash(css)).toContain('@keyframesombelle-progress-sweep')
  // Forced colours: Canvas track with a CanvasText edge, Highlight fill.
  expect(at(track, 'forced')).toMatchObject({ background: 'Canvas', 'border-color': 'CanvasText', 'box-shadow': 'none' })
  expect(at(fill, 'forced')).toMatchObject({ background: 'Highlight', 'box-shadow': 'none', 'forced-color-adjust': 'none' })
  expect(at(fill + '[data-state="complete"]', 'forced').background).toBe('Highlight')
  // No text, so Progress adds no contrast pair.
  expect(squash(css)).not.toMatch(/(?:^|[;{])color:/)
})
