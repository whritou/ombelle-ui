import { expect, it } from 'vitest'
import { format } from 'prettier/standalone'
import * as postcss from 'prettier/plugins/postcss'
import { getCatalog } from '@ombelle/catalog'
import { supportedStyleFamilies, type ComponentId } from '@ombelle/contracts'
import { compile } from '../src/index.js'
import { forcedBlock, squash } from './new-component-artifacts.js'

it.each(supportedStyleFamilies)(
  'compiles deterministic Switch artifacts in %s',
  async (family) => {
    const catalog = getCatalog('0.1.0')
    const input = {
      catalogRelease: '0.1.0',
      compilerVersion: '0.1.0',
      preset: catalog.presets[family],
      componentIds: ['switch' as ComponentId],
    }
    const result = await compile(input)
    expect(result.artifacts.map((a) => a.logicalPath)).toEqual([
      'components/ui/switch.css',
      'components/ui/switch.tsx',
      'examples/switch.tsx',
      'lib/utils.ts',
      'styles/ui-style.css',
      'styles/ui-tokens.css',
    ])
    const find = (path: string) =>
      result.artifacts.find((a) => a.logicalPath === path)!.content
    expect(find('components/ui/switch.css')).toBe(
      await format(catalog.templates[input.componentIds[0]!].styles![family]!, {
        parser: 'css',
        plugins: [postcss],
        endOfLine: 'lf',
        singleQuote: true,
        semi: false,
      }),
    )
    expect(find('components/ui/switch.tsx')).toContain("import './switch.css'")
    expect(find('components/ui/switch.tsx')).toContain("from '@/lib/utils'")
    for (const text of [
      "from '@/components/ui/switch'",
      'htmlFor="notifications"',
      'name="notifications"',
      'value="enabled"',
      'SwitchThumb',
    ])
      expect(find('examples/switch.tsx')).toContain(text)
    expect(result.dependencies).toEqual([
      { name: '@radix-ui/react-switch', version: '1.4.1' },
      { name: 'clsx', version: '2.1.1' },
      { name: 'react', version: '19.3.1' },
      { name: 'tailwind-merge', version: '3.7.0' },
    ])
    expect(await compile(input)).toEqual(result)
    expect(
      await compile({
        ...input,
        componentIds: [...input.componentIds, ...input.componentIds],
      }),
    ).toEqual(result)
    const combined = await compile({
      ...input,
      componentIds: ['button', ...input.componentIds],
    })
    expect(
      await compile({
        ...input,
        componentIds: [...input.componentIds, 'button', ...input.componentIds],
      }),
    ).toEqual(combined)
    for (const artifact of result.artifacts)
      expect(
        combined.artifacts.find((a) => a.logicalPath === artifact.logicalPath),
      ).toEqual(artifact)
  },
)

it('compiles Switch in liquid glass with the on tint, a solid thumb and its fallbacks', async () => {
  const result = await compile({
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
    preset: getCatalog('0.1.0').presets['liquid-glass'],
    componentIds: ['switch' as ComponentId],
  })
  const css = result.artifacts.find((a) => a.logicalPath === 'components/ui/switch.css')!.content
  const flat = squash(css)
  const block = (selector: string) => flat.split(selector + '{')[1]?.split('}')[0] ?? ''
  const track = '[data-slot="switch"]'
  const on = track + '[data-state="checked"]'
  expect(flat).toContain('@supports((backdrop-filter:blur(1px))or(-webkit-backdrop-filter:blur(1px)))')
  expect(flat).toContain('prefers-reduced-transparency')
  expect(block(track)).toContain('border:var(--border-width)solidvar(--input)')
  // On takes the primary tint at rest + 8 points with a primary rim at 60% and a glow.
  expect(block(on)).toContain('--glass-tint:var(--primary);--glass-tint-amount:calc(var(--glass-primary-tint)+8%)')
  expect(block(on)).toContain('border-color:color-mix(insrgb,var(--primary)60%,transparent)')
  expect(block(on)).toContain('color-mix(insrgb,var(--primary)70%,transparent)')
  expect(flat).toContain('color-mix(insrgb,color-mix(insrgb,var(--glass-tint)var(--glass-tint-amount),var(--card))calc(var(--glass-inner-opacity,calc(var(--glass-opacity)*0.85))*100%),transparent)')
  // The thumb is solid white with the kit's shadow, so its position reads over any backdrop.
  const thumb = block('[data-slot="switch-thumb"]')
  expect(thumb).toContain('background:#fff')
  expect(thumb).toContain('box-shadow:01px3pxrgb(000/0.3),inset0-1px0rgb(000/0.06)')
  expect(thumb).toContain('inset-inline-start')
  expect(flat).toContain('[data-slot="switch-thumb"][data-state="checked"]{inset-inline-start:')
  expect(flat).toContain('{background:color-mix(insrgb,var(--glass-tint)var(--glass-tint-amount),var(--card));-webkit-backdrop-filter:none;backdrop-filter:none')
  expect(flat).toContain(track + ':disabled,' + track + '[data-disabled]{opacity:0.5;border-style:dashed')
  // Forced colours: the thumb's position shows the state; on also takes a Highlight edge.
  const forced = forcedBlock(css)
  expect(forced).toContain('background:Canvas')
  expect(forced).toContain('border-color:ButtonText')
  expect(forced).toContain('border-color:Highlight')
  expect(forced).toContain('background:CanvasText')
  expect(forced).toContain('GrayText')
  expect(forced).toContain('outline-color:Highlight')
  expect(flat).toMatch(/@media\(prefers-reduced-motion:reduce\)\{[^}]*\[data-slot="switch-thumb"\][^}]*transition:none/)
})
