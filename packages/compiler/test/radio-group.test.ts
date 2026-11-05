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

it('compiles Radio Group in liquid glass with tinted option rows and its fallbacks', async () => {
  const result = await compile({
    preset: getCatalog('0.1.0').presets['liquid-glass'],
    componentIds: ['radio-group'],
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
  })
  const css = result.artifacts.find((a) => a.logicalPath === 'components/ui/radio-group.css')!.content
  const flat = squash(css)
  const block = (selector: string) => flat.split(selector + '{')[1]?.split('}')[0] ?? ''
  const item = '[data-slot="radio-group-item"]'
  const row = '[data-slot="radio-group-option"]'
  expect(flat).toContain('@supports((backdrop-filter:blur(1px))or(-webkit-backdrop-filter:blur(1px)))')
  expect(flat).toContain('prefers-reduced-transparency')
  expect(block(item)).toContain('border:var(--border-width)solidvar(--input)')
  // The checked radio takes the primary tint at rest + 8 points and a primary rim at 60%.
  expect(block(item + '[data-state="checked"]')).toContain('--glass-tint:var(--primary);--glass-tint-amount:calc(var(--glass-primary-tint)+8%)')
  expect(block(item + '[data-state="checked"]')).toContain('border-color:color-mix(insrgb,var(--primary)60%,transparent)')
  expect(flat).toContain('color-mix(insrgb,color-mix(insrgb,var(--glass-tint)var(--glass-tint-amount),var(--card))max(calc(var(--glass-inner-opacity,calc(var(--glass-opacity)*0.8))*100%),calc(var(--glass-material,0)*100%)),transparent)')
  // The dot stays foreground ink.
  expect(block('[data-slot="radio-group-indicator"]')).toContain('background:var(--foreground)')
  // Option rows are glass rows: the field surface (background at 55%), the rest tint at 78% when checked, dashed when disabled.
  expect(block(row)).toContain('border:var(--border-width)solidvar(--border)')
  expect(flat).toContain('}' + row + '{background:color-mix(insrgb,var(--background)calc(var(--glass-inner-opacity,calc(var(--glass-opacity)*0.55))*100%),transparent)')
  const checkedRow = row + ':has([data-state="checked"])'
  expect(block(checkedRow)).toContain('--glass-tint:var(--primary);--glass-tint-amount:var(--glass-primary-tint)')
  expect(block(checkedRow)).toContain('border-color:color-mix(insrgb,var(--primary)55%,transparent)')
  expect(flat).toContain('color-mix(insrgb,color-mix(insrgb,var(--glass-tint)var(--glass-tint-amount),var(--card))calc(var(--glass-inner-opacity,calc(var(--glass-opacity)*0.78))*100%),transparent)')
  expect(block(row + ':has([data-disabled])')).toContain('border-style:dashed')
  // A radio inside a row drops its own filter: the row's glass is its backdrop.
  expect(block(row + '*')).toBe('--glass-inner-filter:none;')
  expect(block('[data-slot="radio-group-option-description"]')).toContain('color:var(--muted-foreground)')
  expect(flat).toContain('{background:color-mix(insrgb,var(--glass-tint)var(--glass-tint-amount),var(--card));-webkit-backdrop-filter:none;backdrop-filter:none')
  const forced = forcedBlock(css)
  expect(forced).toContain(checkedRow + '{')
  expect(forced).toContain('border-color:Highlight')
  expect(forced).toContain('background:CanvasText')
  expect(forced).toContain('GrayText')
})
