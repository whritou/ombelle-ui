import { expect, it } from 'vitest'
import { format } from 'prettier/standalone'
import * as postcss from 'prettier/plugins/postcss'
import { getCatalog } from '@ombelle/catalog'
import { supportedStyleFamilies, type ComponentId } from '@ombelle/contracts'
import { compile } from '../src/index.js'
import { forcedBlock, squash } from './new-component-artifacts.js'

it.each(supportedStyleFamilies)(
  'compiles deterministic Checkbox artifacts in %s',
  async (family) => {
    const catalog = getCatalog('0.1.0')
    const input = {
      catalogRelease: '0.1.0',
      compilerVersion: '0.1.0',
      preset: catalog.presets[family],
      componentIds: ['checkbox' as ComponentId],
    }
    const result = await compile(input)
    expect(result.artifacts.map((a) => a.logicalPath)).toEqual([
      'components/ui/checkbox.css',
      'components/ui/checkbox.tsx',
      'examples/checkbox.tsx',
      'lib/utils.ts',
      'styles/ui-style.css',
      'styles/ui-tokens.css',
    ])
    const find = (path: string) =>
      result.artifacts.find((a) => a.logicalPath === path)!.content
    expect(find('components/ui/checkbox.css')).toBe(
      await format(catalog.templates[input.componentIds[0]!].styles![family]!, {
        parser: 'css',
        plugins: [postcss],
        endOfLine: 'lf',
        singleQuote: true,
        semi: false,
      }),
    )
    expect(find('components/ui/checkbox.tsx')).toContain(
      "import './checkbox.css'",
    )
    expect(find('components/ui/checkbox.tsx')).toContain("from '@/lib/utils'")
    for (const text of [
      "from '@/components/ui/checkbox'",
      'htmlFor="terms"',
      'name="terms"',
      'aria-describedby="terms-error"',
      'aria-invalid="true"',
      'defaultChecked="indeterminate"',
    ])
      expect(find('examples/checkbox.tsx')).toContain(text)
    expect(result.dependencies).toEqual([
      { name: '@radix-ui/react-checkbox', version: '1.4.1' },
      { name: 'clsx', version: '2.1.1' },
      { name: 'lucide-react', version: '1.55.0' },
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

it('compiles Checkbox in liquid glass with the checked tint and its fallbacks', async () => {
  const result = await compile({
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
    preset: getCatalog('0.1.0').presets['liquid-glass'],
    componentIds: ['checkbox' as ComponentId],
  })
  const css = result.artifacts.find((a) => a.logicalPath === 'components/ui/checkbox.css')!.content
  const flat = squash(css)
  const block = (selector: string) => flat.split(selector + '{')[1]?.split('}')[0] ?? ''
  const box = '[data-slot="checkbox"]'
  const checked = box + '[data-state="checked"]'
  expect(flat).toContain('@supports((backdrop-filter:blur(1px))or(-webkit-backdrop-filter:blur(1px)))')
  expect(flat).toContain('prefers-reduced-transparency')
  // The unchecked box is field glass: background at 55% coverage with the input-colour edge.
  expect(block(box)).toContain('border:var(--border-width)solidvar(--input)')
  expect(flat).toContain('color-mix(insrgb,var(--background)calc(var(--glass-inner-opacity,calc(var(--glass-opacity)*0.55))*100%),transparent)')
  // Checked and indeterminate take the primary tint at rest + 8 points, a primary rim at 60% and a glow.
  expect(flat).toContain(checked + ',' + box + '[data-state="indeterminate"]{--glass-tint:var(--primary);--glass-tint-amount:calc(var(--glass-primary-tint)+8%)')
  expect(block(checked + ',' + box + '[data-state="indeterminate"]')).toContain('border-color:color-mix(insrgb,var(--primary)60%,transparent)')
  expect(block(checked + ',' + box + '[data-state="indeterminate"]')).toContain('color-mix(insrgb,var(--primary)70%,transparent)')
  expect(flat).toContain('color-mix(insrgb,color-mix(insrgb,var(--glass-tint)var(--glass-tint-amount),var(--card))calc(var(--glass-inner-opacity,calc(var(--glass-opacity)*0.8))*100%),transparent)')
  // The mark stays foreground ink in every state.
  expect(block(box)).toContain('color:var(--foreground)')
  expect(flat).not.toMatch(/--primary-foreground/)
  // Without blur the tinted surface is opaque.
  expect(flat).toContain('{background:color-mix(insrgb,var(--glass-tint)var(--glass-tint-amount),var(--card));-webkit-backdrop-filter:none;backdrop-filter:none')
  expect(flat).toContain(box + ':disabled,' + box + '[data-disabled]{opacity:0.5;border-style:dashed')
  // Forced colours: the mark shows the state, never colour alone.
  const forced = forcedBlock(css)
  expect(forced).toContain('background:Canvas')
  expect(forced).toContain('color:CanvasText')
  expect(forced).toContain('border-color:ButtonText')
  expect(forced).toContain('GrayText')
  expect(forced).toContain('outline-color:Highlight')
  expect(forced).not.toContain('background:Highlight')
})
