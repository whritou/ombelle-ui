import { expect, it } from 'vitest'
import { supportedStyleFamilies } from '@ombelle/contracts'
import { getCatalog } from '@ombelle/catalog'
import { compile } from '../src/index.js'
import {
  expectStandaloneArtifacts,
  forcedBlock,
  squash,
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

it('refuses Accordion in liquid glass', async () => {
  await expect(
    compile({
      preset: getCatalog('0.1.0').presets['liquid-glass'],
      componentIds: ['accordion'],
      catalogRelease: '0.1.0',
      compilerVersion: '0.1.0',
    }),
  ).rejects.toMatchObject({ code: 'STYLE_UNAVAILABLE' })
})
