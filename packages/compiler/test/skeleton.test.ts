import { expect, it } from 'vitest'
import { supportedStyleFamilies } from '@ombelle/contracts'
import { getCatalog } from '@ombelle/catalog'
import { compile } from '../src/index.js'
import { expectStandaloneArtifacts, forcedBlock, squash } from './new-component-artifacts.js'

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

it('refuses Skeleton in liquid glass', async () => {
  await expect(
    compile({
      preset: getCatalog('0.1.0').presets['liquid-glass'],
      componentIds: ['skeleton'],
      catalogRelease: '0.1.0',
      compilerVersion: '0.1.0',
    }),
  ).rejects.toMatchObject({ code: 'STYLE_UNAVAILABLE' })
})
