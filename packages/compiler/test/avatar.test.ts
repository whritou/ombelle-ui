import { expect, it } from 'vitest'
import { supportedStyleFamilies } from '@ombelle/contracts'
import { getCatalog } from '@ombelle/catalog'
import { compile, glassContrastPairs, glassContrastReport } from '../src/index.js'
import { expectStandaloneArtifacts, forcedBlock, squash } from './new-component-artifacts.js'

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

it('compiles Avatar in liquid glass: foreground initials on glass discs with a white rim', async () => {
  const result = await compile({
    preset: getCatalog('0.1.0').presets['liquid-glass'],
    componentIds: ['avatar'],
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
  })
  const css = result.artifacts.find((a) => a.logicalPath === 'components/ui/avatar.css')!.content
  const flat = squash(css)
  const block = (selector: string) => flat.split(selector + '{')[1]?.split('}')[0] ?? ''
  const disc = '[data-slot="avatar"]'
  expect(flat).toContain('@supports((backdrop-filter:blur(1px))or(-webkit-backdrop-filter:blur(1px)))')
  expect(flat).toContain('prefers-reduced-transparency')
  // Foreground initials at 600 on a disc with a white rim at 55%; no foreground-on-colour tokens.
  expect(block(disc)).toContain('color:var(--foreground)')
  expect(block(disc)).toContain('font-weight:600')
  expect(block(disc)).toContain('border:var(--border-width)solidrgb(255255255/55%)')
  expect(flat).not.toMatch(/--(primary|accent)-foreground/)
  // The primary variant is card + primary at the resting Button tint (18% light / 22% dark) with a primary rim.
  expect(block(disc + '[data-variant="primary"]')).toContain('--glass-tint:var(--primary);--glass-tint-amount:var(--glass-primary-tint)')
  expect(block(disc + '[data-variant="primary"]')).toContain('border-color:color-mix(insrgb,var(--primary)55%,transparent)')
  // The disc paints the tint mixed into the card, then the full glass coverage: the Button rest pair.
  expect(flat).toContain(
    'color-mix(insrgb,color-mix(insrgb,var(--glass-tint)var(--glass-tint-amount),var(--card))calc(var(--glass-inner-opacity,var(--glass-opacity))*100%),transparent)',
  )
  // Without blur the disc is the opaque tinted card.
  expect(flat).toContain('{background:color-mix(insrgb,var(--glass-tint)var(--glass-tint-amount),var(--card));-webkit-backdrop-filter:none;backdrop-filter:none')
  // A green status dot with a white ring.
  expect(block('[data-slot="avatar-status"]')).toContain('background:#16a34a')
  expect(block('[data-slot="avatar-status"]')).toContain('border:2pxsolidrgb(255255255/85%)')
  // Groups overlap with a white rim instead of an opaque ring.
  expect(block('[data-slot="avatar-group"]>*')).toContain('box-shadow:0002pxrgb(255255255/55%)')
  expect(block('[data-slot="avatar-group"]>*+*')).toContain('margin-inline-start:-0.625rem')
  expect(flat).not.toMatch(/outline:2pxsolidvar\(--card\)/)
  // Forced colours: presence fills when online and is hollow otherwise, so it never depends on colour.
  const forced = forcedBlock(css)
  expect(forced).toContain(disc + '{background:Canvas;color:CanvasText;border-color:CanvasText')
  expect(forced).toContain('[data-slot="avatar-status"]{background:Canvas;border-color:CanvasText')
  expect(forced).toContain('[data-slot="avatar-status"][data-status="online"]{background:CanvasText;border-color:Canvas')
  // Initials reuse declared pairs: neutral discs are foreground on card glass, primary discs the Button rest tint.
  expect(glassContrastPairs).toContainEqual({ surface: 'card', text: 'foreground' })
  expect(glassContrastPairs).toContainEqual({ surface: 'card', text: 'foreground', tint: { color: 'primary', light: 0.18, dark: 0.22 } })
  const report = glassContrastReport(getCatalog('0.1.0').presets['liquid-glass'])
  const initials = report.pairs.filter(
    (p) => p.surface === 'card' && p.text === 'foreground' && p.coverage === undefined && (p.tint === undefined || (p.tint.color === 'primary' && p.tint.amount === (p.mode === 'light' ? 0.18 : 0.22))),
  )
  expect(initials).toHaveLength(4)
  for (const pair of initials) expect(pair.passes, JSON.stringify(pair)).toBe(true)
})
