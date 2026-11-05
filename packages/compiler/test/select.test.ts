import { expect, it } from 'vitest'
import { supportedStyleFamilies } from '@ombelle/contracts'
import { getCatalog } from '@ombelle/catalog'
import { compile } from '../src/index.js'
import {
  expectStandaloneArtifacts,
  forcedBlock,
  squash,
} from './new-component-artifacts.js'

it.each(supportedStyleFamilies)(
  'compiles a deterministic standalone Select in %s',
  async (family) => {
    const { css } = await expectStandaloneArtifacts(family, 'select', {
      importLine: "from '@/components/ui/select'",
      dependencies: [
        '@radix-ui/react-select',
        'clsx',
        'lucide-react',
        'react',
        'tailwind-merge',
      ],
    })
    const forced = forcedBlock(css)
    expect(forced).toContain(
      '[data-slot="select-item"][data-highlighted]{background:Highlight;color:HighlightText;forced-color-adjust:none',
    )
    expect(forced).toMatch(/\[data-slot="select-item"\]\[data-disabled\]\{[^}]*color:GrayText/)
    expect(forced).toMatch(/\[data-slot="select-content"\]\{[^}]*CanvasText/)
    expect(forced).toMatch(/\[data-slot="select-trigger"\]\{[^}]*background:Field/)
    expect(forced).toContain('outline-color:Highlight')
  },
)

it('refuses Select in liquid glass', async () => {
  await expect(
    compile({
      preset: getCatalog('0.1.0').presets['liquid-glass'],
      componentIds: ['select'],
      catalogRelease: '0.1.0',
      compilerVersion: '0.1.0',
    }),
  ).rejects.toMatchObject({ code: 'STYLE_UNAVAILABLE' })
})

it('offset-shadow families cast Select shadows in the preset shadow colour', async () => {
  for (const family of ['ombelle', 'neo-brutalism'] as const) {
    const { css } = await expectStandaloneArtifacts(family, 'select', {
      importLine: "from '@/components/ui/select'",
      dependencies: ['@radix-ui/react-select', 'clsx', 'lucide-react', 'react', 'tailwind-merge'],
    })
    expect(squash(css)).toMatch(
      /\[data-slot="select-content"\]\{[^}]*box-shadow:[^;]*var\(--shadow-color,var\(--border\)\)/,
    )
  }
})
