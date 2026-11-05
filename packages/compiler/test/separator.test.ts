import { expect, it } from 'vitest'
import { supportedStyleFamilies } from '@ombelle/contracts'
import { getCatalog } from '@ombelle/catalog'
import { compile } from '../src/index.js'
import { expectStandaloneArtifacts, forcedBlock } from './new-component-artifacts.js'

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

it('refuses Separator in liquid glass', async () => {
  await expect(
    compile({
      preset: getCatalog('0.1.0').presets['liquid-glass'],
      componentIds: ['separator'],
      catalogRelease: '0.1.0',
      compilerVersion: '0.1.0',
    }),
  ).rejects.toMatchObject({ code: 'STYLE_UNAVAILABLE' })
})
