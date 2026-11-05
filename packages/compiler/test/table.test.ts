import { expect, it } from 'vitest'
import { supportedStyleFamilies } from '@ombelle/contracts'
import { getCatalog } from '@ombelle/catalog'
import { compile } from '../src/index.js'
import { expectStandaloneArtifacts, forcedBlock } from './new-component-artifacts.js'

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

it('refuses Table in liquid glass', async () => {
  await expect(
    compile({
      preset: getCatalog('0.1.0').presets['liquid-glass'],
      componentIds: ['table'],
      catalogRelease: '0.1.0',
      compilerVersion: '0.1.0',
    }),
  ).rejects.toMatchObject({ code: 'STYLE_UNAVAILABLE' })
})
