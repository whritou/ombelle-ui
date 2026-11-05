import { expect, it } from 'vitest'
import { supportedStyleFamilies } from '@ombelle/contracts'
import { getCatalog } from '@ombelle/catalog'
import { compile } from '../src/index.js'
import { expectStandaloneArtifacts, forcedBlock, rulesIn, squash, type Context } from './new-component-artifacts.js'

it.each(supportedStyleFamilies)(
  'compiles a deterministic standalone Skeleton in %s',
  async (family) => {
    const { css } = await expectStandaloneArtifacts(family, 'skeleton', {
      importLine: "from '@/components/ui/skeleton'",
      dependencies: ['clsx', 'react', 'tailwind-merge'],
    })
    expect(forcedBlock(css)).toContain('[data-slot="skeleton"]{background:Canvas;border:1pxsolidGrayText')
    expect(squash(css)).toContain('animation:ombelle-skeleton-pulsecalc(var(--motion-duration)*10)')
  },
)

it('compiles Skeleton in liquid glass: a 10% foreground film with a white sheen and rim, pulsing on the motion duration', async () => {
  const preset = getCatalog('0.1.0').presets['liquid-glass']
  const result = await compile({ preset, componentIds: ['skeleton'], catalogRelease: '0.1.0', compilerVersion: '0.1.0' })
  const css = result.artifacts.find((a) => a.logicalPath === 'components/ui/skeleton.css')!.content
  const at = (selector: string, context: Context = 'root') => rulesIn(css, selector, context)
  const sk = '[data-slot="skeleton"]'
  // Unset, --glass-film-backing leaves the kit's 10% film over nothing under a 35% white sheen; a reduced preset
  // sets it to 1, so the film is opaque over card and the sheen is gone, as under the OS setting.
  const film = 'color-mix(insrgb,var(--foreground)10%,color-mix(insrgb,var(--card)calc(var(--glass-film-backing,0)*100%),transparent))'
  const sheen = 'color-mix(insrgb,whitecalc((1-var(--glass-film-backing,0))*35%),transparent)'
  expect(at(sk)).toMatchObject({
    border: '1pxsolidrgb(255255255/30%)',
    'border-radius': '999px',
    animation: 'ombelle-skeleton-pulsecalc(var(--motion-duration)*10)ease-in-outinfinitealternate',
  })
  expect(at(sk).background).toBe('linear-gradient(tobottom,' + sheen + ',transparent70%),' + film)
  expect(at(sk, 'supports')['backdrop-filter']).toContain('blur(var(--glass-blur))')
  expect(at(sk, 'reduced')).toMatchObject({ background: 'color-mix(insrgb,var(--foreground)10%,var(--card))', 'backdrop-filter': 'none' })
  expect(at(sk + '[data-shape="circle"]')['border-radius']).toBe('50%')
  expect(at(sk + '[data-shape="block"]')['border-radius']).toBe('calc(var(--radius)+2px)')
  expect(at(sk, 'motion').animation).toBe('none')
  expect(at(sk, 'forced')).toMatchObject({ background: 'Canvas', 'border-color': 'GrayText', 'forced-color-adjust': 'none' })
  expect(squash(css)).not.toMatch(/(?:^|[;{])color:/)
})
