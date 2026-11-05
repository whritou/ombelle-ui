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
  'compiles a deterministic standalone Radio Group in %s',
  async (family) => {
    const { css } = await expectStandaloneArtifacts(family, 'radio-group', {
      importLine: "from '@/components/ui/radio-group'",
      dependencies: ['@radix-ui/react-radio-group', 'clsx', 'react', 'tailwind-merge'],
    })
    const forced = forcedBlock(css)
    expect(forced).toMatch(/\[data-slot="radio-group-item"\]\{[^}]*color:Highlight;border-color:ButtonText/)
    expect(forced).toMatch(/\[data-slot="radio-group-item"\]\[data-state="checked"\]\{[^}]*border-color:Highlight/)
    expect(forced).toContain('[data-slot="radio-group-item"]:focus-visible{outline-color:Highlight')
    expect(forced).toContain('GrayText')
  },
)

it.each(supportedStyleFamilies)(
  'gives every %s radio a hit target of at least 24px',
  async (family) => {
    const { css } = await expectStandaloneArtifacts(family, 'radio-group', {
      importLine: "from '@/components/ui/radio-group'",
      dependencies: ['@radix-ui/react-radio-group', 'clsx', 'react', 'tailwind-merge'],
    })
    const item = squash(css).match(/\[data-slot="radio-group-item"\]\{([^}]*)\}/)![1]!
    const size = Number(item.match(/inline-size:([\d.]+)rem/)![1]) * 16
    const hit = squash(css).match(/\[data-slot="radio-group-item"\]::before\{[^}]*inset:-(\d+)px/)
    expect(size + 2 * Number(hit?.[1] ?? 0)).toBeGreaterThanOrEqual(24)
  },
)

it('refuses Radio Group in liquid glass', async () => {
  await expect(
    compile({
      preset: getCatalog('0.1.0').presets['liquid-glass'],
      componentIds: ['radio-group'],
      catalogRelease: '0.1.0',
      compilerVersion: '0.1.0',
    }),
  ).rejects.toMatchObject({ code: 'STYLE_UNAVAILABLE' })
})
