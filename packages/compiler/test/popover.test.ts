import { expect, it } from 'vitest'
import { supportedStyleFamilies } from '@ombelle/contracts'
import {
  expectStandaloneArtifacts,
  forcedBlock,
  squash,
} from './new-component-artifacts.js'

const dependencies = ['@radix-ui/react-popover', 'clsx', 'react', 'tailwind-merge']

it.each([...supportedStyleFamilies, 'liquid-glass'] as const)(
  'compiles a deterministic standalone Popover in %s',
  async (family) => {
    const { css } = await expectStandaloneArtifacts(family, 'popover', {
      importLine: "from '@/components/ui/popover'",
      dependencies,
    })
    const forced = forcedBlock(css)
    expect(forced).toMatch(/\[data-slot="popover-content"\]\{background:Canvas;color:CanvasText;border[^}]*box-shadow:none/)
    expect(forced).toContain('[data-slot="popover-content"]:focus-visible{outline-color:Highlight')
  },
)

it('offset-shadow families cast the popover shadow in the preset shadow colour', async () => {
  for (const family of ['ombelle', 'neo-brutalism'] as const) {
    const { css } = await expectStandaloneArtifacts(family, 'popover', {
      importLine: "from '@/components/ui/popover'",
      dependencies,
    })
    expect(squash(css)).toMatch(
      /\[data-slot="popover-content"\]\{[^}]*box-shadow:[^;]*var\(--shadow-color,var\(--border\)\)/,
    )
  }
})
