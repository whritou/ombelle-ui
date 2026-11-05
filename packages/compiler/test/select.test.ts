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

it('compiles Select in liquid glass: the field trigger, the Dropdown Menu surface and tinted options', async () => {
  const result = await compile({
    preset: getCatalog('0.1.0').presets['liquid-glass'],
    componentIds: ['select'],
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
  })
  const css = result.artifacts.find((a) => a.logicalPath === 'components/ui/select.css')!.content
  const flat = squash(css)
  const block = (selector: string) => flat.split(selector + '{')[1]?.split('}')[0] ?? ''
  const trigger = '[data-slot="select-trigger"]'
  const content = '[data-slot="select-content"]'
  const item = '[data-slot="select-item"]'
  expect(flat).toContain('@supports((backdrop-filter:blur(1px))or(-webkit-backdrop-filter:blur(1px)))')
  expect(flat).toContain('prefers-reduced-transparency')
  // The trigger is the B1 field surface.
  expect(block(trigger)).toContain('border:var(--border-width)solidvar(--input)')
  expect(block(trigger)).toContain('color:var(--foreground)')
  expect(flat).toContain('color-mix(insrgb,var(--background)calc(var(--glass-inner-opacity,calc(var(--glass-opacity)*0.55))*100%),transparent)')
  expect(flat).toContain('color-mix(insrgb,whitecalc(var(--glass-sheen)*60%),transparent),transparent70%')
  expect(block(trigger + '[data-placeholder]')).toContain('color:var(--muted-foreground)')
  expect(block('[data-slot="select-icon"]')).toContain('color:var(--muted-foreground)')
  expect(block(trigger + ':focus-visible')).toContain('border-color:var(--ring)')
  expect(block(trigger + '[aria-invalid="true"]')).toContain('border-color:var(--destructive)')
  expect(block(trigger + ':disabled,' + trigger + '[data-disabled]')).toContain('border-style:dashed')
  // The item hint is the kit's caption: 11px, 600, uppercase, letter-spaced, mutedForeground.
  expect(block('[data-slot="select-item-hint"]')).toBe('margin-inline-start:auto;color:var(--muted-foreground);font-size:0.6875rem;font-weight:600;letter-spacing:0.07em;text-transform:uppercase;')
  // The content is the Dropdown Menu glass surface, animated only when open.
  expect(block(content)).toContain('border:var(--border-width)solidvar(--border)')
  expect(block(content)).toContain('color:var(--popover-foreground)')
  expect(block(content)).toContain('rgb(000/0.35)')
  expect(block(content + '*')).toContain('--glass-inner-opacity:var(--glass-nested-opacity)')
  expect(flat).toContain('color-mix(insrgb,var(--popover)calc(var(--glass-inner-opacity,var(--glass-opacity))*100%),transparent)')
  expect(flat).toContain(content + '[data-state="open"]{animation:ombelle-select-enter')
  expect(block(content)).not.toContain('animation')
  // The highlighted option takes the primary tint; the selected one is bold with the check.
  expect(block(item + '[data-highlighted]')).toContain('--glass-tint:var(--primary);--glass-tint-amount:var(--glass-primary-tint)')
  // Option text is the foreground the highlight pairs declare, not the popover foreground it would inherit.
  expect(block(item)).toContain('color:var(--foreground)')
  expect(flat).not.toContain('color-mix(insrgb,var(--glass-tint)var(--glass-tint-amount),transparent)')
  const tinted = 'color-mix(insrgb,var(--glass-tint)var(--glass-tint-amount),var(--popover))'
  // Without backdrop-filter the content is opaque popover, so the highlight is the opaque tinted mix.
  expect(block(item + '[data-highlighted]')).toContain('background:' + tinted + ';')
  // With backdrop-filter the highlight is its own glass surface, painted as the model's tinted popover pair: the tint
  // mixed into the popover first, then the glass coverage (nested inside the content), under the content's sheen.
  const supports = flat.split('@supports((backdrop-filter:blur(1px))or(-webkit-backdrop-filter:blur(1px))){')[1] ?? ''
  expect(supports.split(item + '[data-highlighted]{')[1]?.split('}')[0]).toBe(
    'background:linear-gradient(tobottom,color-mix(insrgb,whitecalc(var(--glass-sheen)*100%),transparent),transparent60%),' +
      'color-mix(insrgb,' + tinted + 'calc(var(--glass-inner-opacity,var(--glass-opacity))*100%),transparent);',
  )
  // Reduced transparency paints the opaque tinted mix.
  const reduced = supports.split('@media(prefers-reduced-transparency:reduce){')[1] ?? ''
  expect(reduced.split(item + '[data-highlighted]{')[1]?.split('}')[0]).toBe('background:' + tinted + ';')
  expect(block(item + '[data-state="checked"]')).toContain('font-weight:600')
  expect(block('[data-slot="select-item-indicator"]')).toContain('position:absolute')
  expect(block(item + '[data-disabled]')).toContain('color:var(--muted-foreground)')
  // Fallbacks: opaque without blur, system colours when forced, no state by colour alone.
  const forced = forcedBlock(css)
  expect(forced).toContain(item + '[data-highlighted]{background:Highlight;color:HighlightText;forced-color-adjust:none')
  expect(forced).toContain('GrayText')
  expect(forced).toContain('background:Field')
  expect(forced).toContain('background:Canvas')
  expect(flat).toContain('animation:none')
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
