import { expect, it } from 'vitest'
import { supportedStyleFamilies } from '@ombelle/contracts'
import {
  expectStandaloneArtifacts,
  forcedBlock,
  squash,
} from './new-component-artifacts.js'

const dependencies = [
  '@radix-ui/react-dropdown-menu',
  'clsx',
  'lucide-react',
  'react',
  'tailwind-merge',
]

it.each([...supportedStyleFamilies, 'liquid-glass'] as const)(
  'compiles a deterministic standalone Dropdown Menu in %s',
  async (family) => {
    const { css } = await expectStandaloneArtifacts(family, 'dropdown-menu', {
      importLine: "from '@/components/ui/dropdown-menu'",
      dependencies,
    })
    const forced = forcedBlock(css)
    expect(forced).toMatch(
      /\[data-slot="dropdown-menu-content"\],\[data-slot="dropdown-menu-sub-content"\]\{[^}]*color:CanvasText/,
    )
    expect(forced).toContain(
      '[data-slot="dropdown-menu-sub-trigger"][data-state="open"]{background:Highlight;color:HighlightText;forced-color-adjust:none',
    )
    expect(forced).toContain('GrayText')
    expect(forced).toContain('[data-slot="dropdown-menu-separator"]')
  },
)

it.each(supportedStyleFamilies)(
  '%s menu checkbox and radio indicators show their checked state in forced colors',
  async (family) => {
    const { css } = await expectStandaloneArtifacts(family, 'dropdown-menu', {
      importLine: "from '@/components/ui/dropdown-menu'",
      dependencies,
    })
    expect(forcedBlock(css)).toContain(
      '[data-state="checked"]>[data-slot="dropdown-menu-item-indicator"]{background:Highlight;color:HighlightText;border-color:Highlight',
    )
  },
)

it('liquid glass menus drop the backdrop under reduced transparency', async () => {
  const { css } = await expectStandaloneArtifacts('liquid-glass', 'dropdown-menu', {
    importLine: "from '@/components/ui/dropdown-menu'",
    dependencies,
  })
  expect(squash(css)).toContain('@media(prefers-reduced-transparency:reduce)')
  expect(squash(css)).toContain('backdrop-filter:none')
})
