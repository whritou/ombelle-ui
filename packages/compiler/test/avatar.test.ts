import { expect, it } from 'vitest'
import { supportedStyleFamilies } from '@ombelle/contracts'
import { getCatalog } from '@ombelle/catalog'
import { compile } from '../src/index.js'
import { expectStandaloneArtifacts, forcedBlock } from './new-component-artifacts.js'

it.each(supportedStyleFamilies)(
  'compiles a deterministic standalone Avatar in %s',
  async (family) => {
    const { css } = await expectStandaloneArtifacts(family, 'avatar', {
      importLine: "from '@/components/ui/avatar'",
      dependencies: ['@radix-ui/react-avatar', 'clsx', 'react', 'tailwind-merge'],
    })
    const forced = forcedBlock(css)
    expect(forced).toMatch(/\[data-slot="avatar"\]\{background:Canvas;color:CanvasText;border/)
    // Presence stays visible without colour: filled when online, hollow when offline.
    expect(forced).toContain('[data-slot="avatar-status"]{background:CanvasText')
    expect(forced).toContain('[data-slot="avatar-status"][data-status="offline"]{background:Canvas;border-color:CanvasText')
  },
)

it('refuses Avatar in liquid glass', async () => {
  await expect(
    compile({
      preset: getCatalog('0.1.0').presets['liquid-glass'],
      componentIds: ['avatar'],
      catalogRelease: '0.1.0',
      compilerVersion: '0.1.0',
    }),
  ).rejects.toMatchObject({ code: 'STYLE_UNAVAILABLE' })
})
