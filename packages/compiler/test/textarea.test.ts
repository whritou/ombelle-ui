import { expect, it } from 'vitest'
import { format } from 'prettier/standalone'
import * as postcss from 'prettier/plugins/postcss'
import { getCatalog } from '@ombelle/catalog'
import { supportedStyleFamilies, type ComponentId } from '@ombelle/contracts'
import { compile } from '../src/index.js'
import { forcedBlock, squash } from './new-component-artifacts.js'
import baseline from './fixtures/style-baseline.json'

const id = 'textarea' as ComponentId
const base = { catalogRelease: '0.1.0', compilerVersion: '0.1.0' }

it.each(supportedStyleFamilies)(
  'compiles standalone Textarea artifacts with colocated CSS in %s',
  async (family) => {
    const result = await compile({
      ...base,
      preset: getCatalog('0.1.0').presets[family],
      componentIds: [id],
    })
    expect(result.artifacts.map((a) => a.logicalPath)).toEqual([
      'components/ui/textarea.css',
      'components/ui/textarea.tsx',
      'examples/textarea.tsx',
      'lib/utils.ts',
      'styles/ui-style.css',
      'styles/ui-tokens.css',
    ])
    const find = (path: string) =>
      result.artifacts.find((a) => a.logicalPath === path)!.content
    expect(find('components/ui/textarea.tsx')).toContain(
      "import './textarea.css'",
    )
    const catalogCss = getCatalog('0.1.0').templates[id].styles![family]!
    expect(find('components/ui/textarea.css')).toBe(
      await format(catalogCss, {
        parser: 'css',
        plugins: [postcss],
        endOfLine: 'lf',
        singleQuote: true,
        semi: false,
      }),
    )
  },
)

it('emits the Textarea usage example', async () => {
  const result = await compile({
    ...base,
    preset: getCatalog('0.1.0').presets.flat,
    componentIds: [id],
  })
  const usage = result.artifacts.find(
    (a) => a.logicalPath === 'examples/textarea.tsx',
  )!.content
  expect(usage).toContain("from '@/components/ui/textarea'")
  expect(usage).toContain('aria-invalid="true"')
  expect(usage).toContain('aria-describedby="summary-error"')
})

it.each(supportedStyleFamilies)(
  'deduplicates and orders Textarea inputs without changing existing %s artifacts',
  async (family) => {
    const input = { ...base, preset: getCatalog('0.1.0').presets[family] }
    const single = await compile({ ...input, componentIds: [id] })
    expect(await compile({ ...input, componentIds: [id, id] })).toEqual(single)
    const legacyIds = [
      'button',
      'badge',
      'card',
      'dialog',
      'input',
    ] as ComponentId[]
    const legacy = await compile({ ...input, componentIds: legacyIds })
    const combined = await compile({
      ...input,
      componentIds: [id, ...legacyIds],
    })
    expect(
      await compile({
        ...input,
        componentIds: [...[...legacyIds].reverse(), id, id],
      }),
    ).toEqual(combined)
    for (const legacyId of legacyIds) {
      const alone = await compile({ ...input, componentIds: [legacyId] })
      for (const artifact of alone.artifacts.filter((a) =>
        a.logicalPath.includes(legacyId),
      ))
        expect(
          combined.artifacts.find(
            (a) => a.logicalPath === artifact.logicalPath,
          ),
        ).toEqual(artifact)
    }
    for (const artifact of legacy.artifacts.filter((a) =>
      a.logicalPath.startsWith('components/ui/'),
    ))
      expect(
        combined.artifacts.find((a) => a.logicalPath === artifact.logicalPath),
      ).toEqual(artifact)
    if (family === 'flat' || family === 'neo-brutalism')
      for (const artifact of baseline.families[family].artifacts)
        expect(
          combined.artifacts.find((a) => a.logicalPath === artifact.logicalPath)
            ?.sha256,
        ).toBe(artifact.sha256)
  },
)

it('compiles Textarea in liquid glass with its reduced-transparency and forced-colors fallbacks', async () => {
  const result = await compile({
    ...base,
    preset: getCatalog('0.1.0').presets['liquid-glass'],
    componentIds: [id],
  })
  const css = result.artifacts.find(
    (a) => a.logicalPath === 'components/ui/textarea.css',
  )!.content
  const flat = squash(css)
  const block = (selector: string) => flat.split(selector + '{')[1]?.split('}')[0] ?? ''
  expect(flat).toContain('@media(forced-colors:active)')
  expect(flat).toContain('prefers-reduced-transparency')
  const field = '[data-slot="textarea"]'
  expect(flat).toContain('@supports((backdrop-filter:blur(1px))or(-webkit-backdrop-filter:blur(1px)))')
  expect(block(field)).toContain('border:var(--border-width)solidvar(--input)')
  expect(flat).toContain('color-mix(insrgb,var(--background)calc(var(--glass-inner-opacity,calc(var(--glass-opacity)*0.55))*100%),transparent)')
  expect(flat).toContain(field + '::placeholder{color:var(--muted-foreground)')
  expect(flat).toContain(field + '[aria-invalid="true"]{border-color:var(--destructive);border-width:max(var(--border-width),2px)')
  expect(flat).toContain(field + ':disabled{opacity:0.5')
  expect(flat).toContain(field + '{background:var(--background)')
  expect(flat).toContain(field + '{background:Field')
  expect(forcedBlock(css)).toContain('color:FieldText')
})
