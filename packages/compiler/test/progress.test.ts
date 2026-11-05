import { expect, it } from 'vitest'
import { supportedStyleFamilies } from '@ombelle/contracts'
import { getCatalog } from '@ombelle/catalog'
import { compile } from '../src/index.js'
import { expectStandaloneArtifacts, forcedBlock, squash } from './new-component-artifacts.js'

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

it('refuses Progress in liquid glass', async () => {
  await expect(
    compile({
      preset: getCatalog('0.1.0').presets['liquid-glass'],
      componentIds: ['progress'],
      catalogRelease: '0.1.0',
      compilerVersion: '0.1.0',
    }),
  ).rejects.toMatchObject({ code: 'STYLE_UNAVAILABLE' })
})
