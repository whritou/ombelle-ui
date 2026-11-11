import { expect, it } from 'vitest'
import { supportedStyleFamilies } from '@ombelle/contracts'
import { expectStandaloneArtifacts, forcedBlock } from './new-component-artifacts.js'

it.each([...supportedStyleFamilies, 'liquid-glass'] as const)(
  'compiles a deterministic standalone Alert in %s',
  async (family) => {
    const { css } = await expectStandaloneArtifacts(family, 'alert', {
      importLine: "from '@/components/ui/alert'",
      dependencies: ['clsx', 'lucide-react', 'react', 'tailwind-merge'],
    })
    const forced = forcedBlock(css)
    expect(forced).toMatch(/\[data-slot="alert"\]\{background:Canvas;color:CanvasText;border/)
    // Destructive alerts stay distinguishable without colour.
    expect(forced).toMatch(/\[data-slot="alert"\]\[data-variant="destructive"\]\{[^}]*border-style:double/)
  },
)
